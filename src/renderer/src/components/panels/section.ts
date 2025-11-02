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

import { html } from '@xel/utils/template'
import type XAccordionElement from '@xel/elements/x-accordion'

//==============================================================================

import type { BaseElement } from '../uiElements/index.ts'

//==============================================================================

export function prefixId(idPrefix: string, id: string): string {
    return `${idPrefix}-${id.replace(/ /g, '_')}`
}

//==============================================================================

class Field {
    #prompt: string
    #value: string = ''

    constructor(
        readonly name: string,
        prompt: string,
        value: string = '',
        readonly units: string = '',
        readonly desc: string = ''
    ) {
        if (prompt.length < 2 || !/[a-zA-Z]/.test(prompt.substring(1, 1)) || /[A-Z]/.test(prompt.substring(0, 1))) {
            this.#prompt = prompt
        } else {
            this.#prompt = prompt.substring(0, 1).toUpperCase() + prompt.substring(1)
        }
        this.#prompt = this.#prompt.split(';')[0]
        this.#value = value
    }

    get value() {
        return this.#value
    }
    set value(value: string) {
        this.#value = value
    }

    entryHtml(_idPrefix: string): string {
        return ''
    }

    html(idPrefix: string): string {
        //============================
        return `<x-box vertical>
            <x-label class="property-title">${this.#prompt}</x-label>
            <x-label class="property-desc">${this.desc}</x-label>
            <x-box class="property-value">
                ${this.entryHtml(idPrefix)}
            </x-box>
        </x-box>`
    }
}

//==============================================================================

export class EntryField extends Field {
    entryHtml(idPrefix: string): string {
        return `<x-input id="${prefixId(idPrefix, this.name)}" value="${this.value}" spellcheck></x-input>
                <x-label class="offset-label">${this.units}</x-label>`
    }
}

//==============================================================================

export class EntryText extends Field {
    entryHtml(idPrefix: string): string {
        return `<x-texteditor id="${prefixId(idPrefix, this.name)}" spellcheck></x-texteditor>`
    }
}

//==============================================================================

type SectionOptions = {
    expanded?
}

export class SectionDefinition {
    constructor(
        readonly id,
        readonly title: string,
        readonly propertyDefinitions: EntryField[]
    ) {
        if (propertyDefinitions.length === 0) {
            console.error(`No properties defined for '${id}' section`)
        }
    }

    prefixedId(name: string): string {
        //==============================
        return prefixId(this.id, name)
    }

    isPrefixed(id: string): boolean {
        //=============================
        return id.startsWith(`${this.id}-`)
    }

    name(id: string): string {
        //======================
        return this.isPrefixed(id) ? id.slice(this.id.length + 1) : ''
    }

    htmlElement(panel: BaseElement, options: SectionOptions = {}): XAccordionElement {
        //===========================================================================
        // Preserve accordian state when a panel is updated
        const accordianElement = panel.getElementById(this.id) as XAccordionElement
        const expanded = options.expanded || (accordianElement && accordianElement.expanded)
        return html`<x-accordion id="${this.id}" ${expanded ? 'expanded' : ''}>
    <header>
        <h3>
            <x-message autocapitalize>${this.title}</x-message>
        </h3>
    </header>
    <main>
        <x-box vertical>
            ${this.propertyDefinitions.map((property) => property.html(this.id)).join('\n')}
        </x-box>
    </main>
</x-accordion>` as XAccordionElement
    }
}

//==============================================================================
