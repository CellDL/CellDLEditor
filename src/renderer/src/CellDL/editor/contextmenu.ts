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
import type XContextMenu from '@xel/elements/x-contextmenu'
import type XMenuItemElement from '@xel/elements/x-menuitem'

import { BaseElement } from '@renderer/uiElements'

//==============================================================================

export enum CONTEXT_MENU {
    DELETE = 'menu-delete',
    EDIT_GROUP = 'menu-edit-group',
    INFO = 'menu-info',
    GROUP_OBJECTS = 'menu-group',
    UNGROUP_OBJECTS = 'menu-ungroup'
}

//==============================================================================

export class ContextMenu extends BaseElement {
    #contextMenu: XContextMenu | null = null
    #enabled: boolean = false
    #menuItems: number = 0
    #open: boolean = false

    static _shadowTemplate = html`
        <x-contextmenu>
            <x-menu>
                <x-menuitem id="${CONTEXT_MENU.DELETE}" disabled>
                    <x-label>Delete</x-label>
                </x-menuitem>
                <hr/>
                <x-menuitem id="${CONTEXT_MENU.GROUP_OBJECTS}" disabled>
                    <x-label>Group</x-label>  <!-- Make container ?? -->
                </x-menuitem>
                <x-menuitem id="${CONTEXT_MENU.EDIT_GROUP}" disabled>
                    <x-label>Edit group</x-label>   <!-- Edit container ?? -->
                </x-menuitem>
                <x-menuitem id="${CONTEXT_MENU.UNGROUP_OBJECTS}" disabled>
                    <x-label>Ungroup</x-label>
                </x-menuitem>
                <hr/>
                <x-menuitem id="${CONTEXT_MENU.INFO}" disabled>
                    <x-label>Info</x-label>   <!-- Edit compartment ?? -->
                </x-menuitem>
            </x-menu>
        </x-contextmenu>
    `

    async connectedCallback() {
        //=======================
        this.#contextMenu = this.shadowRoot.firstChild as XContextMenu
        this.#menuItems = this.#contextMenu.querySelectorAll('x-menuitem').length
        this.#setEnabled()
        this.addElementListeners('click')
    }

    get isOpen() {
        //==========
        return this.#open
    }

    #setEnabled() {
        //===========
        const disabledItems = this.#contextMenu!.querySelectorAll('x-menuitem[disabled]').length
        this.#enabled = disabledItems < this.#menuItems
    }

    enableItem(itemId: string, enable: boolean = true) {
        //==============================================
        const item = this.getElementById(itemId) as XMenuItemElement
        if (item) {
            item.disabled = !enable
        }
        this.#setEnabled()
    }

    open(clientX: number, clientY: number) {
        //====================================
        if (this.#enabled) {
            this.#contextMenu!.open(clientX, clientY)
            this.#open = true
        }
    }

    close() {
        //=====
        this.#contextMenu!.close()
        this.#open = false
    }
}

//==============================================================================

customElements.define('context-menu', ContextMenu)

//==============================================================================
