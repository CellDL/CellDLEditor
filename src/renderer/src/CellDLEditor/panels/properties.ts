/******************************************************************************

CellDL Editor

Copyright (c) 2022 - 2025 David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

******************************************************************************/

import { css, html } from '@xel/utils/template'

//==============================================================================

import type { CellDLDiagram } from '../diagram/index.ts'
import type { CellDLObject } from '../celldlObjects/index.ts'

import { BaseElement } from '../uiElements/index.ts'

import type { ComponentTemplate } from '../components/index.ts'
import { libraryManager } from '../libraries/manager.ts'
import type { ModelValue } from '../libraries/bondgraph/libbondgraph/model.ts'

import type { StringProperties } from '../types/index.ts'

//==============================================================================

import type { PanelInterface } from './index.ts'
import { prefixId, EntryField, SectionDefinition } from './section.ts'

//==============================================================================

const MODELLING_DOMAIN_ID = 'modelling-domain'
const NODE_VALUES_ID = 'node-values'
const PARAMETER_VALUES_ID = 'parameter-values'
const STATE_VALUES_ID = 'state-values'

//==============================================================================

function modellingElementHtml(componentElement: string) {
    return `<x-box vertical>
    <header>
        <h3>
            <x-message autocapitalize>Element:</x-message>
        </h3>
    </header>
    <main>
        <x-box class='offset-label'>
            <x-message autocapitalize>${componentElement}</x-message>
        </x-box>
    </main>
</x-box>`
}

//==============================================================================

class ModelValuesSection {
    #section: SectionDefinition
    #idToModelValue: Map<string, ModelValue> = new Map()

    constructor(
        readonly id: string,
        title: string,
        modelValues: ModelValue[]
    ) {
        this.#section = new SectionDefinition(
            id,
            title,
            modelValues.map((value) => {
                return new EntryField(value.name, value.description, `${value.value}`, value.units)
            })
        )
        modelValues.map((value) => {
            this.#idToModelValue.set(prefixId(id, value.name), value)
        })
    }

    has(valueId: string): boolean {
        //===========================
        return this.#idToModelValue.has(valueId)
    }

    html(panel: PropertiesPanel): string {
        //==================================
        return this.#section.htmlElement(panel).outerHTML
    }

    setValue(valueId: string, value: string) {
        //======================================
        if (isNaN(+value)) {
            throw new Error('Not a valid numeric value')
        }
        const modelValue = this.#idToModelValue.get(valueId)
        if (modelValue) {
            // trim, check number and raise exception

            modelValue.value = +value
        }
    }
}

//==============================================================================

export default class PropertiesPanel extends BaseElement implements PanelInterface {
    static _shadowTemplate = html`
        <div id='properties-panel'>
            <x-box>
                <h2><x-message autocapitalize="">Properties</x-message></h2>
                <img id="properties-image" class="library-icon"/>
            </x-box>
            <div id='component-properties'></div>
        </div>
    `

    static _shadowStyleSheet = css`
        #properties-panel {
            overflow: scroll;
            height: 100%;
        }
        #properties-image {
            margin-left: auto;
            margin-right: 20px;
            transform: scale(1.5)
        }
        x-accordion {
            animation: none !important;
            transition-property: none !important;
        }
        x-accordion::part(arrow) {
            --path-data: M 26 20 L 26 80 L 74 50 Z !important;
        }
        x-accordion > header {
            padding: 4px 0 4px 20px;
        }
        x-accordion > header > h3 {
            margin: 4px 0 4px 0;
        }
        x-accordion > main {
            padding: 0 0 4px 0;
        }
        x-input {
            margin-left: 1px;
        }
        x-select,
        .offset-label {
            margin-left: 10px;
        }
        x-label.property-title {
            margin-left: 10px;
            font-weight: bold;
        }
        x-label.property-desc {
            font-size: 11px;
        }
        x-box.property-value {
            margin-left: 10px;
            padding-bottom: 4px;
        }
        x-select {
            width: 150px;
        }
        x-select::before {
            content: "";
            display: block;
            width: 20px;
            height: calc(100% - 4px);
            position: absolute;
            top: 2px;
            right: 2px;
            background: linear-gradient(to bottom,var(--light-accent-color),var(--accent-color));
            border: 1px solid var(--dark-accent-color);
            border-radius: 4px;
            box-sizing: border-box;
        }
        x-select::part(arrow) {
            margin: 0 5px 0 11px;
            color: white;
          --path-data: M 25 41 L 50 16 L 75 41 L 83 34 L 50 1 L 17 34 Z M 17 66 L 50 100 L 83 66 L 75 59 L 50 84 L 25 59 Z ;
        }
        x-menuitem:focus, x-menuitem[expanded] {
            background: var(--darker-accent-color);
            color: #FFF;
        }
    `

    #celldlObject: CellDLObject | null = null
    #component: ComponentTemplate | null = null
    #nodeSettings: StringProperties = {}
    #propertiesImage: HTMLElement
    #templatePropertiesElement: HTMLElement
    #parametersSection: ModelValuesSection | null = null
    #statesSection: ModelValuesSection | null = null

    constructor() {
        super()
        this.#propertiesImage = this.getElementById('properties-image')!
        this.#templatePropertiesElement = this.getElementById('component-properties')!
    }

    #inputEvent(event) {
        //================
        // need undo...
        const field = event.target
        event.target.setCustomValidity('')
        if (this.#component && this.#celldlObject) {
            try {
                if (field.id.startsWith(`${NODE_VALUES_ID}-`)) {
                    if (field.value.trim().includes(' ')) {
                        throw new Error('Blanks are not allowed in field')
                    }
                    this.#nodeSettings[field.id.substring(NODE_VALUES_ID.length + 1)] = field.value.trim()
                    if (this.#component.updateTemplateProperties({ nodeSettings: this.#nodeSettings })) {
                        // Properties have changed
                        this.#propertiesImage.setAttribute('src', this.#component.imageUri)
                        const celldlSvgElement = this.#celldlObject.celldlSvgElement!
                        // Update and redraw the component's SVG element
                        celldlSvgElement.updateSvgElement(this.#component.svg)
                        celldlSvgElement.redraw()
                        this.#celldlObject.updateMetadataProperties(this.#component)
                    }
                } else if (this.#parametersSection && this.#parametersSection.has(field.id)) {
                    this.#parametersSection.setValue(field.id, field.value)
                    this.#celldlObject.updateMetadataProperties(this.#component)
                } else if (this.#statesSection && this.#statesSection.has(field.id)) {
                    this.#statesSection.setValue(field.id, field.value)
                    this.#celldlObject.updateMetadataProperties(this.#component)
                }
            } catch (error) {
                event.target.setCustomValidity((error as Error).message)
            }
        }
    }

    #selectEvent(event) {
        //=================
        if (event.target.id === MODELLING_DOMAIN_ID) {
            if (event.detail.oldValue !== event.detail.newValue) {
                if (this.#component && this.#celldlObject) {
                    // Might have changed parameters and states
                    this.#celldlObject.updateMetadataProperties(this.#component)
                    this.#updatePanel(this.#component)
                }
            }
        }
    }

    #reset() {
        //======
        if (this.#component) {
            // Remove event listeners
            const domainInputField = this.getElementById(MODELLING_DOMAIN_ID)
            if (domainInputField) {
                domainInputField.removeEventListener('change', this.#selectEvent.bind(this))
            }
            for (const inputField of this.#templatePropertiesElement.querySelectorAll('x-input')) {
                inputField.removeEventListener('input', this.#inputEvent.bind(this))
            }
            this.#component = null
            this.#nodeSettings = {}
            this.#propertiesImage.removeAttribute('src')
            this.#templatePropertiesElement.innerHTML = ''
            this.#parametersSection = null
            this.#statesSection = null
        }
    }

    setDiagram(_celldlDiagram: CellDLDiagram) {
        //=======================================
    }

    setCurrentObject(celldlObject: CellDLObject | null) {
        //===============================================
        this.#reset()
        this.#celldlObject = celldlObject
        if (celldlObject) {
            this.#updatePanel(libraryManager.templateFromMetadata(celldlObject.metadataProperties))
        }
    }

    #updatePanel(component: ComponentTemplate | null) {
        //============================================
        if (component) {
            this.#component = component
            const templateProperties = component.templateProperties
            this.#nodeSettings = Object.assign({}, templateProperties.nodeSettings)
            this.#propertiesImage.setAttribute('src', this.#component.imageUri)

            const html: string[] = []

            if ('modelElement' in templateProperties && templateProperties.modelElement) {
                // BG Specific, to be removed
                // Does component include method to get HTML?
                html.push(modellingElementHtml(templateProperties['modelElement']))
            }

            const nodeValueSection = new SectionDefinition(
                NODE_VALUES_ID,
                'Value',
                Object.entries(this.#nodeSettings).map((setting) => new EntryField(setting[0], setting[0], setting[1]))
            )
            html.push(nodeValueSection.htmlElement(this).outerHTML)

            if ('modelParameters' in templateProperties) {
                this.#parametersSection = new ModelValuesSection(
                    PARAMETER_VALUES_ID,
                    'Parameters',
                    templateProperties.modelParameters!
                )
                html.push(this.#parametersSection.html(this))
            } else {
                this.#parametersSection = null
            }

            if ('modelStates' in templateProperties) {
                this.#statesSection = new ModelValuesSection(STATE_VALUES_ID, 'States', templateProperties.modelStates!)
                html.push(this.#statesSection.html(this))
            } else {
                this.#statesSection = null
            }

            this.#templatePropertiesElement.innerHTML = html.join('\n')
            this.updateElements()

            const domainInputField = this.getElementById(MODELLING_DOMAIN_ID)
            if (domainInputField) {
                domainInputField.addEventListener('change', this.#selectEvent.bind(this))
            }

            // Listen on all input fields
            for (const inputField of this.#templatePropertiesElement.querySelectorAll('x-input')) {
                inputField.addEventListener('input', this.#inputEvent.bind(this))
            }
        }
    }
}

//==============================================================================

customElements.define('cd-properties-panel', PropertiesPanel)

//==============================================================================
