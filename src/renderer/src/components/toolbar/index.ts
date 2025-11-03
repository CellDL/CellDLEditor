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
import type XButtonElement from '@xel/elements/x-button'
import type XIconElement from '@xel/elements/x-icon'
import { type ComponentTemplate } from '@editor/components'

//==============================================================================

import { BaseElement } from '../uiElements/index.ts'

import '../connections/options'
import { DEFAULT_CONNECTION_STYLE } from '@renderer/components/connections'

import '../libraries'
import { libraryManager, templateImageEvent } from '@editor/libraries'

//==============================================================================

function drawConnectionIconHref(style: string) {
    return `#${style}-connection`
}

function drawConnectionTooltip(style: string) {
    return `Draw ${style} connection`
}

function componentTooltip(component: ComponentTemplate) {
    return `Add ${component ? component.name : ''}`
}

//==============================================================================

export default class CellDLToolBar extends BaseElement {
    static observedAttributes = ['domain']

    // <-- component tools in a <div> with the ability to dynamically add/remove them -->

    static _shadowTemplate = html`
        <x-buttons id="editor-toolbar" tracking="1" vertical>
            <x-button id="select-tool" skin="dock">
                <x-icon href="#pointer"></x-icon>
                <x-tooltip><x-message>Select elements</x-message></x-tooltip>
            </x-button>
            <x-button id="draw-connection-tool" skin="dock">
                <x-icon id="draw-connection-icon"
                        href="${drawConnectionIconHref(DEFAULT_CONNECTION_STYLE)}"></x-icon>
                <x-icon href="#arrow-expand" class="modal-icon"></x-icon>
                <x-tooltip><x-message>${drawConnectionTooltip(DEFAULT_CONNECTION_STYLE)}</x-message></x-tooltip>
                <x-popover style="--align: right" id="draw-connection-popover">
                    <main>
                        <cd-connection-options connection-style="${DEFAULT_CONNECTION_STYLE}"></cd-connection-options>
                    </main>
                </x-popover>
            </x-button>
            <x-button id="add-component-tool" skin="dock">
                <img class="img-icon" src=""/>
                <x-icon href="#arrow-expand" class="modal-icon"></x-icon>
                <x-tooltip><x-message></x-message></x-tooltip>
                <x-popover style="--align: right" id="add-component-popover">
                    <main>
                        <cd-component-libraries></cd-component-libraries>
                    </main>
                </x-popover>
            </x-button>
            <p class="flex-space"></p>
        </x-buttons>
    `

    static _shadowStyleSheet = css`
        x-button[skin="dock"] > x-icon.modal-icon {
            position: absolute;
            right: 1px;
            bottom: 1px;
            width: 6px;
            height: 6px;
        }
        x-popover {
            color: var(--text-color);
            background: var(--background-color);
            border: 1px solid var(--dark-border-color);
            border-radius: 4px;
            box-shadow: rgba(0, 0, 0, 0.3) 0px 4px 22px;
            --open-transition: none;
        }
        x-button::part(arrow) {
            display: none;
        }
        .img-icon {
            width: 100%;
            height: 100%;
            padding: 0;
            background: none;
        }
        #editor-toolbar {
            height: 100%;
        }
        .flex-space {
            flex-grow: 1;
        }
    `

    #currentComponentIcon: HTMLImageElement | null = null

    async connectedCallback() {
        this.addElementListeners('click')
        this.addElementListeners('open')
        this.addElementListeners('close')

        // Tell editor about the default draw connection settings
        document.dispatchEvent(
            new CustomEvent('update-connection-tool', {
                detail: {
                    style: DEFAULT_CONNECTION_STYLE
                }
            })
        )

        // Save the add component icon so it can be updated
        this.#currentComponentIcon = this.shadowRoot.querySelector('#add-component-tool > img') as HTMLImageElement

        // Set the icon to the default componenent
        const defaultComponentUri = libraryManager.defaultComponentUri
        this.#updateComponentTool(defaultComponentUri)

        // Tell editor about the default component in the toolbar
        const event = templateImageEvent(this.#currentComponentIcon)
        event.uri = defaultComponentUri
        document.dispatchEvent(
            new CustomEvent('component-selected', {
                detail: event
            })
        )

        document.addEventListener('update-connection-tool', this.#updateConnectionTool.bind(this))
        document.addEventListener('component-selected', (event) =>
            this.#updateComponentTool((<CustomEvent>event).detail.uri)
        )
    }

    #updateConnectionTool(event: Event) {
        const detail = (<CustomEvent>event).detail
        const icon = this.getElementById('draw-connection-icon') as XIconElement
        if (icon) {
            icon.href = drawConnectionIconHref(detail.style)
        }
        const msg = this.shadowRoot.querySelector('#draw-connection-tool x-tooltip > x-message')
        if (msg) {
            msg.textContent = drawConnectionTooltip(detail.style)
        }
    }

    #updateComponentTool(componentUri: string) {
        const component = libraryManager.template(componentUri)
        if (component) {
            this.#currentComponentIcon!.setAttribute('src', component.imageUri)
            const msg = this.shadowRoot.querySelector('#add-component-tool x-tooltip > x-message')
            if (msg) {
                msg.textContent = componentTooltip(component)
            }
        }
    }

    async disconnectedCallback() {
        //==========================
        this.removeElementListeners('click')
        this.removeElementListeners('open')
        this.removeElementListeners('close')
    }

    enable(enabled: boolean = true) {
        //===========================
        for (const element of this.elements) {
            ;(element as XButtonElement).disabled = !enabled
            if (!enabled) {
                ;(element as XButtonElement).toggled = false
            }
        }
    }

    enableButton(id: string, toggled: boolean) {
        //========================================
        for (const element of this.elements) {
            if (element.id === id) {
                ;(element as XButtonElement).toggled = toggled
            } else {
                ;(element as XButtonElement).toggled = false
            }
        }
    }
}

//==============================================================================

customElements.define('cd-tool-bar', CellDLToolBar)

//==============================================================================
