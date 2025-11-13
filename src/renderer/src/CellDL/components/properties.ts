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

import { CellDLObject } from '@editor/celldlObjects/index'
import { BGF_NAMESPACE, DCT_NAMESPACE, RDFS_NAMESPACE, type NamedNode }  from '@editor/metadata/index'

import type { PropertiesType } from '@renderer/common/types'

//==============================================================================

type ItemDetails = locApi.IUiJsonInput & {
    uri: string
    value?: string|number
    optional?: boolean
}

export interface PropertyGroup {
    items: ItemDetails[]
    title: string
}

//==============================================================================

const VARIABLE_ITEMS: ItemDetails[] = [
    {
        uri: BGF_NAMESPACE('hasSpecies').value,
        name: 'Species',
        defaultValue: ''
    },
    {
        uri: BGF_NAMESPACE('hasLocation').value,
        name: 'Location',
        defaultValue: ''
    }
]

const METADATA_ITEMS: ItemDetails[] = [
    {
        uri: RDFS_NAMESPACE('label').value,
        name: 'Label',
        defaultValue: ''
    },
    {
        uri: DCT_NAMESPACE('description').value,
        name: 'Description',
        defaultValue: ''
    }
]

const PROPERTIES_TEMPLATE: PropertyGroup[] = [
    {
        title: 'Element',
        items: VARIABLE_ITEMS
    },
    {
        title: 'Parameters',
        items: []
    },
    {
        title: 'Metadata',
        items: METADATA_ITEMS
    }
]

//==============================================================================

const componentProperties = vue.ref<PropertyGroup[]>([])

export function provideComponentProperties() {
    componentProperties.value = structuredClone(PROPERTIES_TEMPLATE)
    for (const group of componentProperties.value) {
        group.items = []
    }
    vue.provide<PropertyGroup[]>('componentProperties', componentProperties)
}

//==============================================================================

export class ObjectPropertiesPanel {

    setCurrentObject(celldlObject: CellDLObject|null) {
        // Clear each group's list of items
        for (const group of componentProperties.value) {
            group.items = []
        }
        if (celldlObject) {
            const metadata = celldlObject.metadata  // metadataProperties
            PROPERTIES_TEMPLATE.forEach((template, index) => {
                const group = componentProperties.value[index]
                template.items.forEach((item: ItemDetails) => {
                    if (item.uri in metadata) {
                        group.items.push(Object.assign({
                            value: metadata[item.uri] || item.defaultValue || '',
                            ...item
                        }))
                    } else if (!item.optional) {
                        group.items.push({
                            value: '',
                            ...item
                        })
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
