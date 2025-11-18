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

import {
    CellDLConnection,
    CellDLObject
} from '@editor/celldlObjects/index'
import {
    type ComponentLibrary,
    type ComponentLibraryTemplate,
    type ObjectTemplate,
} from '@editor/components/index'
import { type ItemDetails, type PropertyGroup, type ValueChange } from '@editor/components/properties'
import { BondgraphComponents, BondgraphPlugin } from '@editor/plugins/bondgraph/index'
import { MetadataPropertiesMap, RdfStore } from '@editor/metadata/index'

//==============================================================================

export class PluginComponents {
    static #instance: PluginComponents | null = null

    #bondgraphPlugin = new BondgraphPlugin()
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

    addNewConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        this.#bondgraphPlugin.addNewConnection(connection, rdfStore)
    }

    addDocumentMetadata(rdfStore: RdfStore) {
        this.#bondgraphPlugin.addDocumentMetadata(rdfStore)
    }

    deleteConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        this.#bondgraphPlugin.deleteConnection(connection, rdfStore)
    }

    getObjectTemplate(id: string): ObjectTemplate|undefined {
        return this.#bondgraphPlugin.getObjectTemplate(id)
    }

    getPropertyGroups(): PropertyGroup[] {
        return this.#bondgraphPlugin.getPropertyGroups()
    }

    getComponentProperties(componentProperties: PropertyGroup[],
                           celldlObject: CellDLObject, rdfStore: RdfStore) {
        return this.#bondgraphPlugin.getComponentProperties(componentProperties, celldlObject, rdfStore)
    }

    updateComponentProperties(componentProperties: PropertyGroup[],
                              value: ValueChange, itemId: string,
                              celldlObject: CellDLObject, rdfStore: RdfStore) {
        return this.#bondgraphPlugin.updateComponentProperties(componentProperties, value, itemId, celldlObject, rdfStore)
    }

    loadComponentLibraries(): ComponentLibraryTemplate|undefined {
        let selectedTemplate: ComponentLibraryTemplate|undefined = undefined
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

    styleRules(): string {
        return this.#bondgraphPlugin.styleRules()
    }

    svgDefinitions(): string {
        return this.#bondgraphPlugin.svgDefinitions()
    }
}

//==============================================================================

// Instantiate our plugin components. This will load the BondgraphPlugin
// and hence BG template definitions from the BG-RDF framework

export const pluginComponents = PluginComponents.instance

//==============================================================================
//==============================================================================
