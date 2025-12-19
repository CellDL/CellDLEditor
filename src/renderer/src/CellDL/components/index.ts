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

import * as $rdf from '@editor/metadata/index'

import type { CellDLObject } from '@editor/celldlObjects/index'
import { MetadataPropertiesMap, type NamedNode } from '@editor/metadata/index'
import { CELLDL, DCT, RDFS, RDF_TYPE } from '@editor/metadata/index'

import type { PointLike } from '@renderer/common/points'
import type { Constructor, StringProperties } from '@renderer/common/types'

//==============================================================================

export interface NewObjectClass {
    CellDLClass: Constructor<CellDLObject>
    type: string
}

export interface ObjectTemplate extends NewObjectClass {
    description?: string
    label?: string
    metadataProperties: MetadataPropertiesMap
    name?: string
    image?: string
    svg?: string
}

//==============================================================================

export interface LibraryComponentTemplate {
    id: string
    name: string
    image: string
    selected?: boolean
}

export interface ComponentLibrary {
    id?: string
    name: string
    templates: LibraryComponentTemplate[]
}

export interface ElementTypeName {
    type: string
    name: string
}

//==============================================================================

export interface NamedProperty {
    name: string
    property: string
}

export const OBJECT_METADATA: NamedProperty[] = [
    {
        name: 'Label',
        property: RDFS('label').value
    },
    {
        name: 'Description',
        property: DCT('description').value
    }
]

//==============================================================================

export interface TemplateProperties {
    nodeSettings?: StringProperties
}

//==============================================================================

export type TemplateEventDetails = {
    id: string,
    centre: PointLike
    offset: PointLike
}

//==============================================================================

export function getTemplateEventDetails(id: string, target: HTMLImageElement,
                                        event: DragEvent|MouseEvent|null): TemplateEventDetails {
    const details = {
        id: id,
        // Centre of target.x/y wrt image top left
        centre: {
            x: target.naturalWidth / 2,
            y: target.naturalHeight / 2
        },
        offset: { x: 0, y: 0 }
    }
    if (event) {
        // Offset of event.x/y wrt centre
        details['offset'] = {
            x: event.offsetX - target.scrollWidth / 2,
            y: event.offsetY - target.scrollHeight / 2
        }
    }
    return details
}

//==============================================================================

export class ComponentTemplate implements ObjectTemplate {
    readonly rdfType: NamedNode
    #constraints: MetadataPropertiesMap | null = null // <<<<<<<<<<
    #definition: MetadataPropertiesMap = new MetadataPropertiesMap()
    #description?: string
    #label?: string
    #maxConnections: number = Infinity
    #roles: MetadataPropertiesMap | null = null
    #svg: string = ''

    constructor(
        readonly CellDLClass: Constructor<CellDLObject>,
        readonly type: string
    ) {
        this.rdfType = $rdf.namedNode(type)
    }

    get constraints() {
        return this.#constraints
    }

    get description() {
        return this.#description
    }

    get label() {
        return this.#label
    }

    get maxConnections() {
        return this.#maxConnections
    }

    get metadataProperties(): MetadataPropertiesMap {
        return MetadataPropertiesMap.fromProperties([[RDF_TYPE, this.rdfType]])
    }

    get name() {
        return this.type.split('#').at(-1)!
    }

    get roles() {
        return this.#roles
    }

    get svg() {
        return this.#svg
    }

    get templateProperties(): TemplateProperties {
        const result: TemplateProperties = {}
        return result
    }

    canConnect(_from: CellDLObject, _to: CellDLObject): boolean {
        return true
    }

    copy(): ComponentTemplate {
        const copy = new ComponentTemplate(this.CellDLClass, this.type)
        copy.assign(this)
        return copy
    }

    assign(other: ComponentTemplate) {
        this.define(other.#definition)
    }

    define(definition: MetadataPropertiesMap) {
        this.#definition = definition
        const label = definition.getProperty(RDFS('label'))
        if (label && $rdf.isLiteral(label)) {
            // @ts-expect-error: `label` is a Literal
            this.#label = label.value
        }
        const maxConnections = definition.getProperty(CELLDL('maxConnections'))
        if (maxConnections && $rdf.isLiteral(maxConnections)) {
            // @ts-expect-error: `maxConnections` is a Literal
            this.#maxConnections = +maxConnections.value
        }
        const constraints = definition.getProperty(CELLDL('hasConstraint'))
        if (constraints instanceof MetadataPropertiesMap) {
            this.#constraints = constraints
        }
        const roles = definition.getProperty(CELLDL('hasRole'))
        if (roles instanceof MetadataPropertiesMap) {
            this.#roles = roles
        }
    }

    /*
     * Sets the SVG text that represents the component.
     *
     * @param      {string}  svg
     *
     */
    setSvg(svg: string) {
        this.#svg = svg
    }

    updateTemplateProperties(_properties: TemplateProperties): boolean {
        return false
    }

    updateFromMetadata(_properties: MetadataPropertiesMap): boolean {
        return true
    }

    validateTemplateProperties(_properties: TemplateProperties) {
        return ''
    }
}

//==============================================================================
//==============================================================================
