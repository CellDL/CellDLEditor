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

import Xel from '@xel/xel'
import { css, html } from '@xel/utils/template'

//==============================================================================

type EventCallback = (event: Event) => void

//==============================================================================

export class BaseElement extends HTMLElement {
    #shadowRoot: ShadowRoot
    #elements: Map<string, HTMLElement> = new Map()
    #listenerCallback: EventCallback | null = null
    #boundEventCallbacks: Map<string, EventCallback> = new Map()

    static _shadowTemplate = html``
    static _shadowStyleSheet = css``
    static _shadowStyleSheets: CSSStyleSheet[] = []

    constructor() {
        super()
        const newElement = this.constructor as typeof BaseElement

        this.#shadowRoot = this.attachShadow({ mode: 'closed' })
        if (newElement._shadowTemplate) {
            this.#shadowRoot.append(document.importNode(newElement._shadowTemplate as Node, true))
        }
        const styleSheets = [Xel.themeStyleSheet]
        if (newElement._shadowStyleSheet) {
            styleSheets.push(newElement._shadowStyleSheet)
        }
        if (newElement._shadowStyleSheets.length) {
            styleSheets.push(...newElement._shadowStyleSheets)
        }
        this.#shadowRoot.adoptedStyleSheets = styleSheets

        this.updateElements()
    }

    get elements() {
        return this.#elements.values()
    }

    get shadowRoot() {
        return this.#shadowRoot
    }

    updateElements() {
        this.#elements = new Map()
        for (const element of Object.values(this.#shadowRoot.querySelectorAll('[id]')) as HTMLElement[]) {
            this.#elements.set(element.id, element)
        }
    }

    getElementById(id: string): HTMLElement | null {
        return this.#elements.get(id) || null
    }

    addElementListeners(type: string) {
        const boundEventCallback = (event: Event) => {
            if (this.#listenerCallback) {
                this.#listenerCallback(event)
            }
        }
        this.#boundEventCallbacks.set(type, boundEventCallback)
        for (const element of this.#elements.values()) {
            element.addEventListener(type, boundEventCallback, true)
        }
    }

    removeElementListeners(type: string) {
        const boundEventCallback = this.#boundEventCallbacks.get(type)
        if (boundEventCallback) {
            for (const element of this.#elements.values()) {
                element.removeEventListener(type, boundEventCallback, true)
            }
            this.#boundEventCallbacks.delete(type)
        }
    }

    clearListener() {
        this.#listenerCallback = null
    }

    setListener(callback: EventCallback) {
        this.#listenerCallback = callback
    }
}

//==============================================================================
