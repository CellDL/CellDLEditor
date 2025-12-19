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

//==============================================================================

import type {
    CellDLConnection,
    CellDLObject
} from '@editor/celldlObjects/index'
import type {
    ComponentLibrary,
    LibraryComponentTemplate,
    ObjectTemplate,
} from '@editor/components/index'
import type {
    PropertyGroup,
    StyleObject,
    ValueChange
} from '@editor/components/properties'
import { BONDGRAPH_COMPONENT_LIBRARY, BondgraphPlugin } from '@editor/plugins/bondgraph/index'
import type { RdfStore } from '@editor/metadata/index'

//==============================================================================

export interface PluginInterface {
    id: string

    newDocument: (uri: string, rdfStore: RdfStore) => void
    addDocumentMetadata: (rdfStore: RdfStore) => void
    addNewConnection: (connection: CellDLConnection, rdfStore: RdfStore) => void
    deleteConnection: (connection: CellDLConnection, rdfStore: RdfStore) => void
    getObjectTemplate: (id: string) => ObjectTemplate|undefined
    getPropertyGroups: () => PropertyGroup[]
    getStylingGroup: () => PropertyGroup
    getComponentProperties: (celldlObject: CellDLObject,
                             componentProperties: PropertyGroup[], rdfStore: RdfStore) => void
    updateComponentProperties: (celldlObject: CellDLObject, itemId: string, value: ValueChange,
                                componentProperties: PropertyGroup[], rdfStore: RdfStore) => void
    updateComponentStyling: (celldlObject: CellDLObject, objectType: string, styling: StyleObject) => void
    styleRules: () => string
    svgDefinitions: () => string
}

//==============================================================================

export class PluginComponents {
    static #instance: PluginComponents | null = null

    #registeredPlugins: Map<string, PluginInterface> = new Map()

    // This will eventually go
    #bondgraphPlugin: PluginInterface|undefined = undefined

    #componentLibraries: ComponentLibrary[] = []
    #componentLibrariesRef = vue.ref<ComponentLibrary[]>(this.#componentLibraries)

    private constructor() {
        if (PluginComponents.#instance) {
            throw new Error('Use PluginComponents.instance instead of `new`')
        }
        PluginComponents.#instance = this
    }

    static get instance() {
        if (!PluginComponents.#instance) {
            PluginComponents.#instance = new PluginComponents()
        }
        return PluginComponents.#instance
    }

    get registeredPlugins(): string[] {
        return [...this.#registeredPlugins.keys()]
    }

    registerPlugin(plugin: PluginInterface) {
        this.#registeredPlugins.set(plugin.id, plugin)
    }

    loadPlugins() {
        this.#bondgraphPlugin = new BondgraphPlugin()
        this.#componentLibraries.push(BONDGRAPH_COMPONENT_LIBRARY)
        vue.provide<vue.Ref<ComponentLibrary[]>>('componentLibraries', this.#componentLibrariesRef)
    }

    getSelectedTemplate(): LibraryComponentTemplate|undefined {
        let selectedTemplate: LibraryComponentTemplate|undefined
        if (this.#componentLibraries.length &&
            // @ts-expect-error: `componentLibraries` is at least 1 long
            this.#componentLibraries[0].templates.length) {

            // Select the default component template

            // @ts-expect-error: `componentLibraries` is at least 1 long
            selectedTemplate = this.#componentLibraries[0].templates[0]
            if (selectedTemplate) {
                selectedTemplate.selected = true
            }
        }
        return selectedTemplate
    }

    //==========================================================================

    newDocument(uri: string, rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            plugin.newDocument(uri, rdfStore)
        }
    }

    addNewConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            plugin.addNewConnection(connection, rdfStore)
        }
    }

    addDocumentMetadata(rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            plugin.addDocumentMetadata(rdfStore)
        }
    }

    deleteConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            plugin.deleteConnection(connection, rdfStore)
        }
    }

    async updateComponentProperties(celldlObject: CellDLObject, itemId: string, value: ValueChange,
                                    componentProperties: PropertyGroup[], rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            await plugin.updateComponentProperties(celldlObject, itemId, value, componentProperties, rdfStore)
        }
    }

    async updateComponentStyling(celldlObject: CellDLObject, objectType: string, styling: StyleObject) {
        for (const plugin of this.#registeredPlugins.values()) {
            await plugin.updateComponentStyling(celldlObject, objectType, styling)
        }
    }

    //==========================================================================

    getObjectTemplate(id: string): ObjectTemplate|undefined {
        return this.#bondgraphPlugin!.getObjectTemplate(id)
    }

    getPropertyGroups(): PropertyGroup[] {
        return this.#bondgraphPlugin!.getPropertyGroups()
    }

    getStylingGroup(): PropertyGroup {
        return this.#bondgraphPlugin!.getStylingGroup()
    }

    getComponentProperties(celldlObject: CellDLObject,
                           componentProperties: PropertyGroup[], rdfStore: RdfStore) {
        return this.#bondgraphPlugin!.getComponentProperties(celldlObject, componentProperties, rdfStore)
    }

    styleRules(): string {
        return this.#bondgraphPlugin!.styleRules()
    }

    svgDefinitions(): string {
        return this.#bondgraphPlugin!.svgDefinitions()
    }
}

//==============================================================================

// Instantiate our plugin components. This will load the BondgraphPlugin
// and hence BG template definitions from the BG-RDF framework

export const pluginComponents = PluginComponents.instance

//==============================================================================
//==============================================================================
