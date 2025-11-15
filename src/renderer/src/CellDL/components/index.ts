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
import { CELLDL_NAMESPACE, DCT_NAMESPACE, RDFS_NAMESPACE, RDF_TYPE } from '@editor/metadata/index'
import { base64Svg } from '@editor/utils'

import type { PointLike } from '@renderer/common/points'
import type { Constructor, StringProperties } from '@renderer/common/types'

//==============================================================================

export interface NewObjectClass {
    CellDLClass: Constructor<CellDLObject>
    uri: string
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

export interface NamedUri {
    name: string
    uri: string
}

export const OBJECT_METADATA: NamedUri[] = [
    {
        name: 'Label',
        uri: RDFS_NAMESPACE('label').value
    },
    {
        name: 'Description',
        uri: DCT_NAMESPACE('description').value
    }
]

//==============================================================================

export interface TemplateProperties {
    nodeSettings?: StringProperties
}

//==============================================================================

export type TemplateEvent = {
    uri: string
    centre: PointLike
    offset: PointLike
}

//==============================================================================

export function templateImageEvent(target: HTMLImageElement, event: MouseEvent | null = null): TemplateEvent {
    const details = {
        uri: target.id,
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
        readonly uri: string
    ) {
        this.rdfType = $rdf.namedNode(uri)
    }

    get constraints() {
        return this.#constraints
    }

    get description() {
        return this.#description
    }

    get imageUri() {
        return base64Svg(this.svg)
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
        return this.uri.split('#').at(-1)!
    }

    get rdfPredicates(): NamedNode[] {
        return []
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
        const copy = new ComponentTemplate(this.CellDLClass, this.uri)
        copy.assign(this)
        return copy
    }

    assign(other: ComponentTemplate) {
        this.define(other.#definition)
    }

    define(definition: MetadataPropertiesMap) {
        this.#definition = definition
        const label = definition.getProperty(RDFS_NAMESPACE('label'))
        if (label && $rdf.isLiteral(label)) {
            this.#label = label.value
        }
        const maxConnections = definition.getProperty(CELLDL_NAMESPACE('maxConnections'))
        if (maxConnections && $rdf.isLiteral(maxConnections)) {
            this.#maxConnections = +maxConnections.value
        }
        const constraints = definition.getProperty(CELLDL_NAMESPACE('hasConstraint'))
        if (constraints instanceof MetadataPropertiesMap) {
            this.#constraints = constraints
        }
        const roles = definition.getProperty(CELLDL_NAMESPACE('hasRole'))
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
