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

import type * as locApi from '@renderer/libopencor/locUIJsonApi'

import { type PropertiesType } from '@renderer/common/types'

import { CellDLObject } from '@editor/celldlObjects/index'
import { type NamedUri, OBJECT_METADATA } from '@editor/components/index'
import * as $rdf from '@editor/metadata/index'
import { MetadataPropertiesMap, RdfStore, SPARQL_PREFIXES } from '@editor/metadata/index'
import { pluginComponents } from '@editor/plugins/index'

//==============================================================================

export type ItemDetails = locApi.IUiJsonInput & {
    itemId: string
    uri: string
    value?: string|number
    optional?: boolean
    selector?: string
}

export interface PropertyGroup {
    groupId: string
    items: ItemDetails[]
    title: string
}

export interface ValueChange {
    oldValue: string
    newValue: string
}

//==============================================================================

const METADATA_GROUP: PropertyGroup = {
    groupId: 'cd-metadata',
    title: 'Metadata',
    items: OBJECT_METADATA.map((nameUri: NamedUri) => {
        return {
            itemId: nameUri.uri,
            uri: nameUri.uri,
            name: nameUri.name,
            defaultValue: ''
        }
    })
}

//==============================================================================
//==============================================================================

export function getItemProperty(celldlObject: CellDLObject,
                                itemTemplate: ItemDetails, rdfStore: RdfStore): ItemDetails|undefined {
    let item: ItemDetails|undefined = undefined

    rdfStore.query(`${SPARQL_PREFIXES}
        PREFIX : <${rdfStore.documentUri}#>

        SELECT ?value WHERE {
            ${celldlObject.uri.toString()} <${itemTemplate.uri}> ?value
        }`
    ).map((r) => {
        const value = r.get('value')!.value
        item = {
            value: value,
            ...itemTemplate
        }
    })
    if (!itemTemplate.optional && item === undefined) {
        item = Object.assign({
            value: itemTemplate.defaultValue || '',
            ...itemTemplate
        })
    }
    return item
}

//==============================================================================

export function updateItemProperty(property: string, value: ValueChange,
                                   celldlObject: CellDLObject, rdfStore: RdfStore) {
    rdfStore.update(`${SPARQL_PREFIXES}
        PREFIX : <${rdfStore.documentUri}#>

        DELETE {
            ${celldlObject.uri.toString()} <${property}> ?value
        }
        WHERE {
            ${celldlObject.uri.toString()} <${property}> ?value
        }`)
    const newValue = value.newValue.trim()
    if (newValue) {
        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            INSERT DATA { ${celldlObject.uri.toString()} <${property}> "${newValue}" }
        `)
    }
}

//==============================================================================

export class ObjectPropertiesPanel {
    #componentProperties = vue.ref<PropertyGroup[]>([])
    #propertyGroups = [...pluginComponents.getPropertyGroups(), METADATA_GROUP]
    #metadataIndex: number

    constructor() {
        this.#metadataIndex = this.#propertyGroups.length - 1
        this.#componentProperties.value = structuredClone(this.#propertyGroups)
        for (const group of this.#componentProperties.value) {
            group.items = []
        }
        // Make data available to the properties panel

        vue.provide<PropertyGroup[]>('componentProperties', this.#componentProperties)
    }

    setObjectProperties(celldlObject: CellDLObject|null, rdfStore: RdfStore) {
        // Clear each group's list of items
        for (const group of this.#componentProperties.value) {
            group.items = []
        }
        if (celldlObject) {
            // Update component properties with plugin specific values

            pluginComponents.getComponentProperties(this.#componentProperties.value, celldlObject, rdfStore)

            // Update component properties in the METADATA_GROUP

            const metadataGroup = this.#propertyGroups[this.#metadataIndex]!
            const group = this.#componentProperties.value[this.#metadataIndex]
            metadataGroup.items.forEach((itemTemplate: ItemDetails) => {
                const item = getItemProperty(celldlObject, itemTemplate, rdfStore)
                if (item) {
                    group.items.push(item)
                }
            })
        }
    }

    updateObjectProperties(value: ValueChange, itemId: string,
                           celldlObject: CellDLObject|null, rdfStore: RdfStore) {
        if (celldlObject) {
            // Save plugin specific component properties

            pluginComponents.updateComponentProperties(this.#componentProperties.value,
                                                       value, itemId, celldlObject, rdfStore)

            // Save component properties in the METADATA_GROUP

            const metadataGroup = this.#propertyGroups[this.#metadataIndex]!
            const group = this.#componentProperties.value[this.#metadataIndex]
            for (const itemTemplate of metadataGroup.items) {
                if (itemId === itemTemplate.itemId) {
                    updateItemProperty(itemTemplate.uri, value, celldlObject, rdfStore)
                    break
                }
            }
        }
    }
}

//==============================================================================
//==============================================================================
