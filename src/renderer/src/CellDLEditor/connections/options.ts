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

import { BaseElement } from '@renderer/uiElements'

//==============================================================================

export enum ConnectionStyle {
    Linear = 'linear',
    Rectilinear = 'rectilinear'
}

export const DEFAULT_CONNECTION_STYLE = ConnectionStyle.Rectilinear

//==============================================================================

class ConnectionOptions extends BaseElement {
    static _shadowTemplate = html`
        <x-box vertical>
            <header>
                <h3>
                    <x-message>Path style</x-message>
                </h3>
            </header>
            <main>
                <section>
                    <x-select id="path-style" role="button">
                        <x-menu role="menu">
                            <x-menuitem value="linear" role="menuitem" togglable>
                                <x-icon href="#linear-connection"></x-icon>
                                <x-label>Linear</x-label>
                            </x-menuitem>
                            <x-menuitem value="rectilinear" role="menuitem" togglable>
                                <x-icon href="#rectilinear-connection"></x-icon>
                                <x-label>Rectilinear</x-label>
                            </x-menuitem>
                        </x-menu>
                    </x-select>
                </section>
            </main>
        </x-box>
    `

    static _shadowStyleSheet = css`
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

    #currentStyle: string

    constructor() {
        super()
        this.#currentStyle = this.getAttribute('connection-style') || DEFAULT_CONNECTION_STYLE
        this.setListener(this.#onChange.bind(this))
    }

    #setToggled(selectId: string, value: string) {
        //==========================================
        for (const element of this.shadowRoot.querySelectorAll(`#${selectId} x-menuitem`)) {
            if ((<XMenuItemElement>element).value === value) {
                ;(<XMenuItemElement>element).toggled = true
            } else {
                ;(<XMenuItemElement>element).toggled = false
            }
        }
    }

    async connectedCallback() {
        //=======================
        this.#setToggled('path-style', this.#currentStyle)
        this.addElementListeners('change')
    }

    async disconnectedCallback() {
        this.removeElementListeners('change')
    }

    #onChange(event) {
        if (event.eventPhase === Event.AT_TARGET) {
            if (event.target.id === 'path-style') {
                if (this.#currentStyle !== event.detail.newValue) {
                    this.#currentStyle = event.detail.newValue
                }
            }
            document.dispatchEvent(
                new CustomEvent('update-connection-tool', {
                    detail: {
                        style: this.#currentStyle
                    }
                })
            )
        }
    }
}

//==============================================================================

customElements.define('cd-connection-options', ConnectionOptions)

//==============================================================================
