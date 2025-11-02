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
import type XAccordionElement from '@xel/elements/x-accordion'
import type XInputElement from '@xel/elements/x-input'

//==============================================================================

import type { CellDLDiagram } from '../diagram/index.ts'
import type { CellDLObject } from '../celldlObjects/index.ts'
import { BaseElement } from '../uiElements/index.ts'

import type { PanelInterface } from './index.ts'
import { EntryField, EntryText, SectionDefinition } from './section.ts'

//==============================================================================

const diagramMetadataSection = new SectionDefinition('diagram-metadata', 'Diagram', [
    new EntryField('title', 'Title', '', '', 'Used to name exported files, with spaces replaced by underscores.'),
    new EntryField('author', 'Author'),
    new EntryText('description', 'Description')
])

const objectMetadataSection = new SectionDefinition('object-metadata', 'Object', [
    new EntryField('label', 'Label'),
    new EntryText('description', 'Description')
])

//==============================================================================

export default class MetadataPanel extends BaseElement implements PanelInterface {
    static _shadowTemplate = html`
        <div id='metadata-panel'>
            <div>
                <h2>
                    <x-message autocapitalize="">Metadata</x-message>
                </h2>
            </div>
            <div id='diagram-section'></div>
            <div id='object-section'></div>
        </div>
    `

    static _shadowStyleSheet = css`
        #metadata-panel {
            overflow: scroll;
            height: 100%;
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
            font-weight: bold;
        }
        x-label.property-desc {
            font-size: 11px;
        }
        x-box.property-value {
            padding-bottom: 4px;
        }
        x-box {
            width: 100%;
        }
        #diagram-metadata-title,
        #diagram-metadata-author {
            width: 240px;
            max-width: 240px;
        }
    `

    #celldlDiagram: CellDLDiagram | null = null
    #celldlObject: CellDLObject | null = null
    #diagramMetadataSection: HTMLElement
    #objectMetadataSection: HTMLElement

    constructor() {
        super()
        this.#diagramMetadataSection = this.getElementById('diagram-section')!
        this.#diagramMetadataSection.innerHTML = ''
        this.#diagramMetadataSection.appendChild(diagramMetadataSection.htmlElement(this, { expanded: true }))
        this.updateElements()
        for (const inputField of this.#diagramMetadataSection.querySelectorAll('x-input, x-texteditor')) {
            inputField.addEventListener('input', this.#inputEvent.bind(this))
        }
        this.#objectMetadataSection = this.getElementById('object-section')!
    }

    setDiagram(celldlDiagram: CellDLDiagram) {
        //======================================
        this.#celldlDiagram = celldlDiagram
        const metadata = celldlDiagram.metadata
        for (const definition of diagramMetadataSection.propertyDefinitions) {
            if (definition.name in metadata) {
                const inputField = this.getElementById(
                    diagramMetadataSection.prefixedId(definition.name)
                ) as XInputElement
                if (inputField) {
                    inputField.value = metadata[definition.name]
                }
            }
        }
    }

    setCurrentObject(celldlObject: CellDLObject | null) {
        //===============================================
        this.#reset()
        this.#celldlObject = celldlObject
        if (celldlObject) {
            ;(<XAccordionElement>this.#diagramMetadataSection.firstChild!).expanded = false
            this.#objectMetadataSection.appendChild(objectMetadataSection.htmlElement(this, { expanded: true }))
            this.updateElements()
            // Set input field values
            const metadata = celldlObject.metadata
            for (const definition of objectMetadataSection.propertyDefinitions) {
                if (definition.name in metadata) {
                    const inputField = this.getElementById(
                        objectMetadataSection.prefixedId(definition.name)
                    ) as XInputElement
                    if (inputField) {
                        inputField.value = metadata[definition.name]
                    }
                }
            }
            // Listen on all input fields
            for (const inputField of this.#objectMetadataSection.querySelectorAll('x-input, x-texteditor')) {
                inputField.addEventListener('input', this.#inputEvent.bind(this))
            }
        }
    }

    #inputEvent(event) {
        //================
        if (this.#celldlDiagram) {
            if (diagramMetadataSection.isPrefixed(event.target.id)) {
                const name = diagramMetadataSection.name(event.target.id)
                this.#celldlDiagram.metadata = Object.fromEntries([[name, event.target.value.trim()]])
            }
            if (this.#celldlObject && objectMetadataSection.isPrefixed(event.target.id)) {
                const name = objectMetadataSection.name(event.target.id)
                this.#celldlObject.metadata = Object.fromEntries([[name, event.target.value.trim()]])
            }
        }
    }

    #reset() {
        //======
        if (this.#celldlObject) {
            // Remove event listeners
            for (const inputField of this.#objectMetadataSection.querySelectorAll('x-input, x-texteditor')) {
                inputField.removeEventListener('input', this.#inputEvent.bind(this))
            }
            this.#celldlObject = null
            this.#objectMetadataSection.innerHTML = ''
        }
    }
}

//==============================================================================

customElements.define('cd-metadata-panel', MetadataPanel)

//==============================================================================
