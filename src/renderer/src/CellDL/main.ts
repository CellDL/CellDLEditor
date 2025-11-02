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

import type { IElectronAPI } from '../../../preload'

import '@renderer/editor'
import type { CellDLEditor } from '@renderer/editor'
import { editGuides } from '@renderer/editor/editguides'
import { CellDLDiagram } from '@renderer/diagram'
import { undoRedo } from '@renderer/editor/undoredo'

//==============================================================================

interface ElectronWindow extends Window {
    electronAPI: IElectronAPI
}
const electronWindow: ElectronWindow = window

//==============================================================================

let celldlEditor: CellDLEditor | null = null

export namespace alert {
    export function error(msg: string) {
        console.error(msg)
        if (celldlEditor) {
            celldlEditor.showTooltip(msg, 'error')
        }
    }

    export function info(msg: string) {
        console.log(msg)
        if (celldlEditor) {
            celldlEditor.showTooltip(msg, 'info')
        }
    }

    export function warn(msg: string) {
        console.warn(msg)
        if (celldlEditor) {
            celldlEditor.showTooltip(msg, 'warn')
        }
    }

    export function elementError(msg: string, svgElement?: SVGGraphicsElement) {
        if (svgElement) {
            svgElement.classList.add('error')
        }
        error(msg)
    }
}

//==============================================================================

export default class CellDLEditorApp extends HTMLElement {
    static #shadowTemplate = html`
        <div id="celldl-editor-app">
            <cd-editor id="celldl-editor"></cd-editor>
        </div>
    ` as Node

    static #shadowStyleSheet = css`
        #celldl-editor-app {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            max-height: 100vh;
        }
    `

    #elements: { [key: string]: HTMLElement } = {}
    #shadowRoot: ShadowRoot | null = null
    #celldlEditor: CellDLEditor | null = null
    #celldlDiagram: CellDLDiagram | null = null

    constructor() {
        super()
        this.hidden = true
    }

    getElementById(id: string): HTMLElement {
        return this.#elements[id]
    }

    async connectedCallback() {
        this.#shadowRoot = this.attachShadow({ mode: 'closed' })
        this.#shadowRoot.adoptedStyleSheets = [Xel.themeStyleSheet, CellDLEditorApp.#shadowStyleSheet]
        this.#shadowRoot.append(document.importNode(CellDLEditorApp.#shadowTemplate, true))
        for (const element of Object.values(this.#shadowRoot.querySelectorAll('[id]')) as HTMLElement[]) {
            this.#elements[element.id] = element
        }
        // Editor UI now exists
        this.#celldlEditor = this.getElementById('celldl-editor') as CellDLEditor
        // Use it for logging
        celldlEditor = this.#celldlEditor

        // Create a new diagram in the editor's window
        this.#celldlDiagram = new CellDLDiagram('', '', this.#celldlEditor)

        // Listen for events from host when running as an Electron app
        if ('electronAPI' in window) {
            window.electronAPI.onFileAction(async (_, action: string, filePath: string, data: string | undefined) => {
                if (action === 'IMPORT' || action === 'OPEN') {
                    // Load CellDL file (SVG and metadata)
                    try {
                        this.#celldlDiagram = new CellDLDiagram(
                            filePath!,
                            data!,
                            this.#celldlEditor!,
                            action === 'IMPORT'
                        )
                    } catch (error) {
                        console.log(error)
                        window.alert((error as Error).toString())
                        window.electronAPI.sendFileAction('ERROR', filePath)
                        this.#celldlDiagram = new CellDLDiagram('', '', this.#celldlEditor!)
                    }
                    this.#celldlEditor!.editDiagram(this.#celldlDiagram)
                } else if (action === 'GET_DATA') {
                    const celldlData = await this.#celldlDiagram?.serialise(filePath!)
                    window.electronAPI.sendFileAction('WRITE', filePath, celldlData)
                    undoRedo.clean()
                }
            })

            window.electronAPI.onMenuAction((_, action: string, ...args) => {
                if (action === 'menu-redo') {
                    undoRedo.redo(this.#celldlDiagram!)
                } else if (action === 'menu-undo') {
                    undoRedo.undo(this.#celldlDiagram!)
                } else if (action === 'show-grid') {
                    if (args.length) {
                        editGuides.showGrid(args[0])
                    }
                }
            })

            // Let Electron know that the editor's window is ready
            window.electronAPI.sendEditorAction('READY')
        } else {
            electronWindow.electronAPI = electronWindow.electronAPI || {
                sendEditorAction: (action: string) => {
                    console.log('Action', action)
                }
            }
        }

        // Start with a new, empty diagram
        this.#celldlEditor?.editDiagram(this.#celldlDiagram)
    }
}

//==============================================================================

customElements.define('cd-editor-app', CellDLEditorApp)

//==============================================================================
