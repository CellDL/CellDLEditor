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

import { templateImageEvent } from '@editor/components'
import { libraryManager } from './manager'

export { templateImageEvent } from '@editor/components/index.ts'
export type { ObjectTemplate, TemplateEvent } from '@editor/components/index.ts'
export { libraryManager } from './manager.ts'

//==============================================================================

class ComponentLibraries {
    /* We need to wait until theme is loaded before defining custom elements... */
    //            background: #3584e4 /* ${Xel.presetAccentColors.blue} */;

    #libContainer: HTMLElement
    #selectedElement: HTMLElement | null = null

    /*
    constructor() {
        this.#libContainer = this.getElementById('component-libraries')!
    }

    async connectedCallback() {
        this.#libContainer.insertAdjacentHTML('beforeend', libraryManager.librariesAsHtml())
        this.updateElements()
        for (const element of this.elements) {
            if (element.getAttribute('draggable')) {
                element.addEventListener('dragstart', this.#dragStartEvent.bind(this), true)
                element.addEventListener('click', this.#clickEvent.bind(this), true)
            }
        }
    }

    async disconnectedCallback() {
        for (const element of this.elements) {
            if (element.getAttribute('draggable')) {
                element.removeEventListener('dragstart', this.#dragStartEvent.bind(this), true)
                element.removeEventListener('click', this.#clickEvent.bind(this), true)
            }
        }
        for (const child of this.#libContainer.children) {
            this.#libContainer.removeChild(child)
        }
    }

    #clickEvent(event) {
        if (this.#selectedElement) {
            this.#selectedElement.classList.remove('selected')
        }
        event.target.classList.add('selected')
        this.#selectedElement = event.target
        document.dispatchEvent(
            new CustomEvent('component-selected', {
                detail: templateImageEvent(this.#selectedElement as HTMLImageElement)
            })
        )
    }

    #dragStartEvent(event: Event) {
        event.dataTransfer.setData('component-detail', JSON.stringify(templateImageEvent(event.target, event)))
        event.dataTransfer.effectAllowed = 'copy'
        this.#clickEvent(event)
        document.dispatchEvent(new CustomEvent('component-drag'))
    }
*/
}

//==============================================================================
