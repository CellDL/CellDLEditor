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
/** biome-ignore-all lint/style/noNonNullAssertion: <keys exist in Map> */

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
import { STYLING_GROUP } from '@editor/components/properties'
import type { RdfStore } from '@renderer/metadata/index'

//==============================================================================

export interface PluginInterface {
    id: string

    componentLibrary: ComponentLibrary
    newDocument: (uri: string, rdfStore: RdfStore) => void
    addDocumentMetadata: (rdfStore: RdfStore) => void
    addNewConnection: (connection: CellDLConnection, rdfStore: RdfStore) => void
    deleteConnection: (connection: CellDLConnection, rdfStore: RdfStore) => void
    getObjectTemplate: (celldlObject: CellDLObject, rdfStore: RdfStore) => ObjectTemplate|undefined
    getObjectTemplateById: (id: string) => ObjectTemplate|undefined
    getPropertyGroups: () => PropertyGroup[]
    updateComponentProperties: (celldlObject: CellDLObject,
                             componentProperties: PropertyGroup[], rdfStore: RdfStore) => void
    updateObjectProperties: (celldlObject: CellDLObject, itemId: string, value: ValueChange,
                                componentProperties: PropertyGroup[], rdfStore: RdfStore) => Promise<void>
    updateComponentStyling: (celldlObject: CellDLObject, objectType: string, styling: StyleObject) =>  Promise<void>
    styleRules: () => string
    svgDefinitions: () => string
}

//==============================================================================

class ComponentLibraryPlugin {
    static #instance: ComponentLibraryPlugin | null = null

    #app: vue.App|undefined = undefined
    #registeredPlugins: Map<string, PluginInterface> = new Map()

    #componentLibraries: ComponentLibrary[] = []
    #componentLibrariesRef = vue.ref<ComponentLibrary[]>(this.#componentLibraries)

    private constructor() {
        if (ComponentLibraryPlugin.#instance) {
            throw new Error('Use ComponentLibraryPlugin.instance instead of `new`')
        }
        ComponentLibraryPlugin.#instance = this
    }

    static get instance() {
        if (!ComponentLibraryPlugin.#instance) {
            ComponentLibraryPlugin.#instance = new ComponentLibraryPlugin()
        }
        return ComponentLibraryPlugin.#instance
    }

    get registeredPlugins(): string[] {
        return [...this.#registeredPlugins.keys()]
    }

    install(app: vue.App, _options: object)  {
        if (!this.#app) {
            app.provide<vue.Ref<ComponentLibrary[]>>('componentLibraries', this.#componentLibrariesRef)
            this.#app = app
        }
    }

    registerPlugin(plugin: PluginInterface) {
        if (!this.#registeredPlugins.has(plugin.id)) {
            this.#componentLibraries.push(plugin.componentLibrary)
            this.#registeredPlugins.set(plugin.id, plugin)
        }
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

    addDocumentMetadata(rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            plugin.addDocumentMetadata(rdfStore)
        }
    }

    addNewConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            plugin.addNewConnection(connection, rdfStore)
        }
    }

    deleteConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        for (const plugin of this.#registeredPlugins.values()) {
            plugin.deleteConnection(connection, rdfStore)
        }
    }

    //==========================================================================

    getObjectTemplateById(fullId: string): ObjectTemplate|undefined {
        const pluginTemplateId = fullId.split('/')
        if (pluginTemplateId.length > 1) {
            const plugin = this.#registeredPlugins.get(pluginTemplateId[0]!)
            if (plugin) {
                return plugin.getObjectTemplateById(pluginTemplateId.slice(1).join('/'))
            }
        }
    }

    //==========================================================================

    getObjectTemplate(celldlObject: CellDLObject, rdfStore: RdfStore): ObjectTemplate|undefined {
        let objectTemplate: ObjectTemplate|undefined
        for (const pluginId of celldlObject.pluginIds) {
            const plugin = this.#registeredPlugins.get(pluginId)
            if (plugin) {
                const template = plugin.getObjectTemplate(celldlObject, rdfStore)
                if (objectTemplate === undefined) {
                    objectTemplate = template
                } else if (template !== undefined) {
                    objectTemplate = { ...objectTemplate, ...template }
                }
            }
        }
        return objectTemplate
    }

    updateComponentProperties(celldlObject: CellDLObject,
                           componentProperties: PropertyGroup[], rdfStore: RdfStore): void {
        for (const pluginId of celldlObject.pluginIds) {
            const plugin = this.#registeredPlugins.get(pluginId)
            if (plugin) {
                plugin.updateComponentProperties(celldlObject, componentProperties, rdfStore)
            }
        }
    }

    async updateComponentStyling(celldlObject: CellDLObject, objectType: string, styling: StyleObject) {
        for (const pluginId of celldlObject.pluginIds) {
            const plugin = this.#registeredPlugins.get(pluginId)
            if (plugin) {
                await plugin.updateComponentStyling(celldlObject, objectType, styling)
            }
        }
    }

    async updateObjectProperties(celldlObject: CellDLObject, itemId: string, value: ValueChange,
                                    componentProperties: PropertyGroup[], rdfStore: RdfStore) {
        for (const pluginId of celldlObject.pluginIds) {
            const plugin = this.#registeredPlugins.get(pluginId)
            if (plugin) {
                await plugin.updateObjectProperties(celldlObject, itemId, value, componentProperties, rdfStore)
            }
        }
    }

    //==========================================================================

    getPropertyGroups(): PropertyGroup[] {
        const propertyGroups: PropertyGroup[] = []
        for (const plugin of this.#registeredPlugins.values()) {
            propertyGroups.push(...plugin.getPropertyGroups())
        }
        return propertyGroups
    }

    getStylingGroup(): PropertyGroup {
        return STYLING_GROUP
    }

    //==========================================================================

    // Global style rules and definitions added to the diagram's SVG

    styleRules(): string {
        const styling: string[] = []
        for (const plugin of this.#registeredPlugins.values()) {
            styling.push(plugin.styleRules())
        }
        return styling.join('\n')
    }

    svgDefinitions(): string {
        const definitions: string[] = []
        for (const plugin of this.#registeredPlugins.values()) {
            definitions.push(plugin.svgDefinitions())
        }
        return definitions.join('\n')
    }
}

//==============================================================================

// Instantiate our plugin components. This will load the BondgraphPlugin
// and hence BG template definitions from the BG-RDF framework

export const componentLibraryPlugin = ComponentLibraryPlugin.instance

//==============================================================================
//==============================================================================
