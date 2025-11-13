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

import * as vue from 'vue'

import { BondgraphComponents, BondgraphPlugin } from '@editor/plugins/bondgraph/index'

//==============================================================================

export interface ComponentTemplate {
    id: string
    label: string
    image: string
    selected?: boolean
}

export interface ComponentLibrary {
    id?: string
    name: string
    components: ComponentTemplate[]
}

//==============================================================================

export class PluginComponents {
    static #instance: PluginComponents | null = null

    #componentLibraries = [BondgraphComponents]
    #componentLibrariesRef = vue.ref<ComponentLibrary[]>(this.#componentLibraries)

    private constructor() {
        if (PluginComponents.#instance) {
            throw new Error('Use PluginComponents.instance instead of `new`')
        }
        PluginComponents.#instance = this
    }

    static get instance() {
        return PluginComponents.#instance ?? (PluginComponents.#instance = new PluginComponents())
    }

    loadComponentLibraries(): ComponentTemplate|undefined {
        let selectedTemplate: ComponentTemplate|undefined = undefined
        if (this.#componentLibraries.length &&
            // @ts-expect-error: `componentLibraries` is at least 1 long
            this.#componentLibraries[0].components.length) {

            // Select the default component template

            // @ts-expect-error: `componentLibraries` is at least 1 long
            selectedTemplate = this.#componentLibraries[0].components[0]
            selectedTemplate!.selected = true
        }
        vue.provide<vue.Ref<ComponentLibrary[]>>('componentLibraries', this.#componentLibrariesRef)
        return selectedTemplate
    }
}

//==============================================================================

export const pluginComponents = PluginComponents.instance

//==============================================================================
//==============================================================================
