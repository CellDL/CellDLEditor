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

import type { CellDLObject } from '@editor/celldlObjects/index'
import { type NamedProperty, OBJECT_METADATA } from '@editor/components/index'
import { type RdfStore, SPARQL_PREFIXES } from '@editor/metadata/index'
import { componentLibraryPlugin } from '@editor/plugins/index'

//==============================================================================

export type ItemDetails = locApi.IUiJsonInput & {
    itemId: string
    property: string
    value?: string|number
    units?: string
    optional?: boolean
    numeric?: boolean
}

export type StyleObject = Object

export interface PropertyGroup {
    groupId: string
    items: ItemDetails[]
    styling?: StyleObject
    title: string
}

export interface ValueChange {
    oldValue: string
    newValue: string
}

//==============================================================================

export const METADATA_GROUP_ID = 'cd-metadata'

const METADATA_GROUP: PropertyGroup = {
    groupId: METADATA_GROUP_ID,
    title: 'Metadata',
    items: OBJECT_METADATA.map((nameUri: NamedProperty) => {
        return {
            itemId: nameUri.property,
            property: nameUri.property,
            name: nameUri.name,
            defaultValue: ''
        }
    })
}

//==============================================================================

export const STYLING_GROUP_ID = 'object-styling'

export const STYLING_GROUP: PropertyGroup = {
    groupId: STYLING_GROUP_ID,
    title: 'Style',
    items: [],
    styling: {}
}

//==============================================================================
//==============================================================================

export function getItemProperty(celldlObject: CellDLObject,
                                itemTemplate: ItemDetails, rdfStore: RdfStore): ItemDetails|undefined {
    const objectUri = celldlObject.uri.toString()
    let value: string|undefined

    rdfStore.query(`${SPARQL_PREFIXES}
        PREFIX : <${celldlObject.celldlDiagram.uri}#>

        SELECT ?value WHERE {
            ${objectUri} <${itemTemplate.property}> ?value
        }`
    ).forEach((r) => {
        value = r.get('value')?.value
    })

    let item: ItemDetails|undefined
    if (value === undefined) {
        if (!itemTemplate.optional) {
            return Object.assign({
                ...itemTemplate,
                value: itemTemplate.defaultValue || ''
            })
        }
        return undefined
    }
    if (itemTemplate.numeric) {
        const valueUnits = value!.split(' ')
        return {
            ...itemTemplate,
            value:  Number(valueUnits[0]),
            units: valueUnits[1]
        }
    }
    return {
        ...itemTemplate,
        value: value
    }
}

//==============================================================================

export function updateItemProperty(property: string, value: ValueChange,
                                   celldlObject: CellDLObject, rdfStore: RdfStore) {
    const objectUri = celldlObject.uri.toString()

    rdfStore.update(`${SPARQL_PREFIXES}
        PREFIX : <${celldlObject.celldlDiagram.uri}#>

        DELETE {
            ${objectUri} <${property}> ?value
        }
        WHERE {
            ${objectUri} <${property}> ?value
        }`)
    const newValue = String(value.newValue).trim()
    if (newValue) {
        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${celldlObject.celldlDiagram.uri}#>

            INSERT DATA { ${objectUri} <${property}> """${newValue.replace('\\', '\\\\')}""" }
        `)
    }
}

//==============================================================================

export class ObjectPropertiesPanel {
    #componentProperties = vue.ref<PropertyGroup[]>([])
    #propertyGroups = [...componentLibraryPlugin.getPropertyGroups(), METADATA_GROUP, componentLibraryPlugin.getStylingGroup()]
    #metadataIndex: number = -1

    constructor() {
        this.#propertyGroups.forEach((group, index) => {
            if (group.groupId === METADATA_GROUP_ID) {
                this.#metadataIndex = index
            }
        })
        this.#componentProperties.value = structuredClone(this.#propertyGroups)
        for (const group of this.#componentProperties.value) {
            group.items = []
        }
        // Make data available to the properties panel

        vue.provide<PropertyGroup[]>('componentProperties', this.#componentProperties)
    }

    //==================================

    setObjectProperties(celldlObject: CellDLObject|null, rdfStore: RdfStore) {
        // Clear each group's list of items
        for (const group of this.#componentProperties.value) {
            group.items = []
            if (group.styling) {
                group.styling = {}
            }
        }
        if (celldlObject) {
            // Update component properties with plugin specific values

            componentLibraryPlugin.updateComponentProperties(celldlObject, this.#componentProperties.value, rdfStore)

            if (this.#metadataIndex >= 0) {
                // Update component properties in the METADATA_GROUP

                const group = this.#componentProperties.value[this.#metadataIndex]
                METADATA_GROUP.items.forEach((itemTemplate: ItemDetails) => {
                    const item = getItemProperty(celldlObject, itemTemplate, rdfStore)
                    if (item) {
                        group.items.push(item)
                    }
                })
            }
        }
    }

    //==================================

    async updateObjectProperties(celldlObject: CellDLObject|null,
                                 itemId: string, value: ValueChange, rdfStore: RdfStore) {
        if (celldlObject) {
            // Save plugin specific component properties

            await componentLibraryPlugin.updateObjectProperties(celldlObject, itemId, value,
                                                             this.#componentProperties.value, rdfStore)

            // Save component properties in the METADATA_GROUP

            const metadataGroup = this.#propertyGroups[this.#metadataIndex]!
            for (const itemTemplate of metadataGroup.items) {
                if (itemId === itemTemplate.itemId) {
                    updateItemProperty(itemTemplate.property, value, celldlObject, rdfStore)
                    break
                }
            }
        }
    }

    //==================================

    async updateObjectStyling(celldlObject: CellDLObject|null, objectType: string, styling: StyleObject) {
        if (celldlObject) {
            await componentLibraryPlugin.updateComponentStyling(celldlObject, objectType, styling)
        }
    }
}

//==============================================================================
//==============================================================================
