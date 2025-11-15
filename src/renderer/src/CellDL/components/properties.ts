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
import { pluginComponents } from '@editor/plugins/index'

//==============================================================================

export type ItemDetails = locApi.IUiJsonInput & {
    uri: string
    value?: string|number
    optional?: boolean
    selector?: string
}

export interface PropertyGroup {
    items: ItemDetails[]
    title: string
}

//==============================================================================

const METADATA_GROUP: PropertyGroup = {
    title: 'Metadata',
    items: OBJECT_METADATA.map((nameUri: NamedUri) => {
        return {
            uri: nameUri.uri,
            name: nameUri.name,
            defaultValue: ''
        }
    })
}

//==============================================================================
//==============================================================================

export class ObjectPropertiesPanel {
    #componentProperties = vue.ref<PropertyGroup[]>([])
    #propertyGroups = [...pluginComponents.propertyGroups(), METADATA_GROUP]
    #metadataIndex: number

    constructor() {
        this.#metadataIndex = this.#propertyGroups.length
        this.#componentProperties.value = structuredClone(this.#propertyGroups)
        for (const group of this.#componentProperties.value) {
            group.items = []
        }
        // Make data available to the properties panel

        vue.provide<PropertyGroup[]>('componentProperties', this.#componentProperties)
    }

    setCurrentObject(celldlObject: CellDLObject|null) {
        // Clear each group's list of items
        for (const group of this.#componentProperties.value) {
            group.items = []
        }
        if (celldlObject) {
            const metadataProperties = celldlObject.metadataProperties
            this.#propertyGroups.forEach((property_group, index) => {
                const group = this.#componentProperties.value[index]
                property_group.items.forEach((itemTemplate: ItemDetails) => {
                    let item: ItemDetails | undefined = undefined
                    if (index !== this.#metadataIndex) {
                        item = pluginComponents.propertyItem(itemTemplate, metadataProperties)
                    } else {
                        const objectValue = metadataProperties.get(itemTemplate.uri)
                        if (objectValue) {
                            // objectValue could be a MetadataPropertiesMap
                            const propertyValue = objectValue.value
                            item = Object.assign({
                                value: propertyValue || itemTemplate.defaultValue || '',
                                ...itemTemplate
                            })
                        } else if (!itemTemplate.optional) {
                            // Non-optional fields with no `metadataProperties` value
                            item = {
                                value: '',
                                ...itemTemplate
                            }
                        }
                    }
                    if (item) {
                        group.items.push(item)
                    }
                })
            })
        }
    }

    updateObject(celldlObject: CellDLObject|null) {
        if (celldlObject) {
            const metadata: PropertiesType = {}
            for (const group of componentProperties.value) {
                group.items.forEach((item: ItemDetails) => {
                    if (item.value !== undefined) {
                        metadata[item.uri] = item.value
                    }
                })
            celldlObject.metadata = metadata
            }
        }
    }
}

//==============================================================================
//==============================================================================
