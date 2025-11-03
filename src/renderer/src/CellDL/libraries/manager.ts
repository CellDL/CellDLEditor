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

import * as $rdf from '@editor/metadata'

import { type CellDLObject, rdfTypeToCellDLObject } from '@editor/celldlObjects'
import { type MetadataPropertiesMap, type PredicateValue, RdfStore, TurtleContentType } from '@editor/metadata'
import { CELLDL_NAMESPACE } from '@editor/metadata'

import type { Constructor } from '@renderer/common/types'

//==============================================================================

import type { ComponentTemplate } from '@editor/components'

//==============================================================================

export interface LibraryDefinition {
    id: string
    title: string
    rdfDefinition: string
    templates: string[]
    defaultComponent?: string
    componentFactory: (CellDLClass: Constructor<CellDLObject>, uri: string) => ComponentTemplate
    svgDefinitions: string[]
    styleRules: string
}

//==============================================================================

class ComponentLibrary {
    readonly id: string
    readonly title: string
    readonly svgDefinitions: string[]
    readonly styleRules: string
    #defaultComponentUri: string = ''
    #templates: Map<string, ComponentTemplate> = new Map()

    constructor(definition: LibraryDefinition) {
        this.id = definition.id
        this.title = definition.title
        this.svgDefinitions = definition.svgDefinitions
        this.styleRules = definition.styleRules

        const graphUri = `http://celldl.org/descriptions/${definition.id}`
        const kb = new RdfStore(graphUri)
        kb.load(definition.rdfDefinition, TurtleContentType)
        this.#defaultComponentUri = definition.defaultComponent || ''
        for (const uri of definition.templates) {
            const definitionPredicates: PredicateValue[] = kb
                .sparqlQuery(`
                PREFIX celldl: <http://celldl.org/ontologies/celldl#>
                select * where {
                    ?s ?p ?o .
                    ?s a celldl:ComponentDefinition .
                    ?s celldl:definesComponent <${uri}> .
                }`)
                .map((r) => {
                    return {
                        predicate: r.get('p'),
                        object: r.get('o')
                    }
                }) as PredicateValue[]
            const properties = kb.metadataFromPredicates(definitionPredicates)
            const objectClass = properties.getProperty(CELLDL_NAMESPACE('objectClass'))
            if (
                objectClass &&
                $rdf.isNamedNode(objectClass) &&
                // @ts-expect-error: uri is a property of a NamedNode
                rdfTypeToCellDLObject.has(objectClass.uri)
            ) {
                // @ts-expect-error: uri is a property of a NamedNode
                const celldlClass = rdfTypeToCellDLObject.get(objectClass.uri)
                const componentTemplate = definition.componentFactory(celldlClass!, uri)
                componentTemplate.define(properties)
                this.#templates.set(uri, componentTemplate)
                if (this.#defaultComponentUri === '') {
                    this.#defaultComponentUri = uri
                }
            }
        }
    }

    get templates() {
        //=============
        return this.#templates
    }

    get defaultComponentUri() {
        //=======================
        return this.#defaultComponentUri
    }
}

//==============================================================================

interface TemplateObjectMethods {
    canConnect: (CellDLObject) => boolean
    maxConnections: () => number
}

//==============================================================================

class LibraryManager {
    static #instance: LibraryManager | null = null

    #defaultComponentUri: string = ''
    #libraries: Map<string, ComponentLibrary> = new Map() // library.id ==> library
    #componentTemplates: Map<string, ComponentTemplate> = new Map() // component.uri ==> component
    #componentLibrary: Map<string, ComponentLibrary> = new Map() // component.uri ==> library

    private constructor() {
        if (LibraryManager.#instance) {
            throw new Error('Use `LibraryManager.instance` instead of `new`')
        }
        LibraryManager.#instance = this
    }

    static get instance() {
        //===================
        return LibraryManager.#instance ?? (LibraryManager.#instance = new LibraryManager())
    }

    get defaultComponentUri(): string {
        //===============================
        return this.#defaultComponentUri
    }

    objectMethods(object: CellDLObject): TemplateObjectMethods {
        //=============================================================
        const template = this.#componentTemplates.get(object.template.uri)
        if (template) {
            return {
                canConnect: template.canConnect.bind(null, object),
                maxConnections: () => template.maxConnections
            }
        } else {
            return {
                canConnect: (_) => true,
                maxConnections: () => Infinity
            }
        }
    }

    /**
    addPlugin(plugin: Plugin)
    //=======================
    {
        if (!this.#plugins.has(plugin.pluginId)) {
            this.#plugins.set(plugin.pluginId, plugin)
            this.#kb.load(plugin.rdfDefinition, $rdf.TurtleContentType, plugin.pluginId)
            for (const template of plugin.templates) {
                this.#templates.set(template.id, [plugin, template])
            }
        }
    }

    deletePlugin(pluginId: $rdf.NamedNode)
    //====================================
    {
        const plugin = this.#plugins.get(pluginId)
        if (plugin) {
            for (const template of plugin.templates) {
                this.#templates.delete(template.id)
            }
            this.#plugins.delete(pluginId)
            this.#kb.removeStatements(null, null, null, pluginId)
        }
    }
**/

    addLibrary(definition: LibraryDefinition) {
        //=======================================
        if (!this.#libraries.has(definition.id)) {
            const componentLibrary = new ComponentLibrary(definition)
            for (const template of componentLibrary.templates.values()) {
                const uri = template.rdfType.uri
                if (this.#componentTemplates.has(uri)) {
                    throw new TypeError(`Already have a Library Component with RDF type of ${template.rdfType}`)
                }
                this.#componentTemplates.set(uri, template)
                this.#componentLibrary.set(uri, componentLibrary)
            }
            if (this.#defaultComponentUri === '') {
                this.#defaultComponentUri = componentLibrary.defaultComponentUri
            }
            this.#libraries.set(definition.id, componentLibrary)
        }
    }

    #templateUriFromMetadata(properties: MetadataPropertiesMap): string | null {
        //======================================================================
        const rdfTypes = properties.rdfTypes
        for (const uri of rdfTypes) {
            if (this.#componentTemplates.has(uri)) {
                return uri
            }
        }
        return null
    }

    templateFromMetadata(properties: MetadataPropertiesMap): ComponentTemplate | null {
        //=============================================================================
        const uri = this.#templateUriFromMetadata(properties)
        if (uri) {
            const template = this.#componentTemplates.get(uri)!.copy()
            template!.updateFromMetadata(properties)
            return template
        }
        return null
    }

    template(uri: string): ComponentTemplate | null {
        //=============================================
        if (this.#componentTemplates.has(uri)) {
            return this.#componentTemplates.get(uri)!
        }
        return null
    }

    copyTemplate(uri: string): ComponentTemplate | null {
        //=================================================
        const template = this.template(uri)
        return template ? template.copy() : null
    }

    librariesAsHtml() {
        //===============
        return `<div class="component-library">${[...this.#libraries.values()]
            .map((lib) => {
                return `<div class="library-title">${lib.title}</div>
                            <div class="library-icons">
                                ${[...lib.templates.entries()]
                                    .map(
                                        ([id, c]) =>
                                            `<img id="${id}" class="library-icon" draggable="true" title="${c.name}" src="${c.imageUri}"/>`
                                    )
                                    .join('\n')}
                            </div>
                        </div>`
            })
            .join('\n')}</div>`
    }

    librarySvgDefinitions(): string[] {
        //===============================
        return [...this.#libraries.values()]
            .map((library) => library.svgDefinitions)
            .reduce((allDefinitions, definitions) => {
                allDefinitions.push(...definitions)
                return allDefinitions
            }, [])
    }

    libraryStyleRules(): string {
        //=========================
        return [...this.#libraries.values()].map((library) => library.styleRules).join('')
    }
}

//==============================================================================

export const libraryManager = LibraryManager.instance

//==============================================================================
