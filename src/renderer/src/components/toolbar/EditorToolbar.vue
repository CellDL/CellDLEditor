<script lang="ts">
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

import { type ComponentTemplate } from '@editor/components'

import { DEFAULT_CONNECTION_STYLE } from '@renderer/components/connections'

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

/***
export default class CellDLToolBar {
    static observedAttributes = ['domain']

    // <-- component tools in a <div> with the ability to dynamically add/remove them -->


    #currentComponentIcon: HTMLImageElement | null = null

    async connectedCallback() {

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
}

**/
</script>

<template lang="pug">
    Toolbar.vertical
        template(#start)
            ToolButton(
                v-for="tool in tools"
                :id="tool.id"
                :prompt="tool.prompt"
                :icon="tool.icon")
                component(
                v-if="tool.panel"
                :is="tool.panel"
                @change="listener")
</template>

<script setup lang="ts">
import * as vue from "vue"

import ConnectionStylePanel from './ConnectionStyle.vue'


// tool list needs to come from CellDLEditor.vue as a property...
const tools = vue.ref([
    {
        id: 'linear',
        prompt: 'Draw linear connection',
        icon: 'ci-linear-connection',
        panel: vue.shallowRef(ConnectionStylePanel)
    },
    {
        id: 'rlinear',
        prompt: 'Draw rectilinear connection',
        icon: 'ci-rectilinear-connection',
        panel: vue.shallowRef(ConnectionStylePanel)
    }
])

// each tool button needs to know how to update its state with changes from its panel

function listener(e) {
    console.log('L', e)
}

</script>

<style>
.p-toolbar.vertical,
.p-toolbar.vertical > .p-toolbar-start {
    flex-direction: column !important;
    width: 38px !important;
    padding: 0 !important;
    flex-wrap: nowrap !important;
    border-radius: 0 !important;
}
</style>

