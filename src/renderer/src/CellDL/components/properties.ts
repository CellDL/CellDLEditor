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

type ItemDetails = locApi.IUiJsonInput & { value: number|string }

export interface PropertyGroup {
    items: ItemDetails[]
    title: string
}

//==============================================================================

const DEFAULT_PROPERTIES: PropertyGroup[] = [
    {
        title: 'Element',
        items: [
            {
                name: 'Species',
                value: 'i'
            },
            {
                name: 'Location',
                value: 'j'
            }
        ]
    },
    {
        title: 'Parameters',
        items: []
    },
    {
        title: 'Metadata',
        items: [
            {
                name: 'Label',
                value: ''
            },
            {
                name: 'Description',
                value: ''
            }
        ]
    }
]

const componentProperties = vue.ref<PropertyGroup[]>([])
    {
        index: '0',
        title: 'Properties',
        items: [
            {
                name: 'species',
                value: 'i'
            }
        ]
    },
    {
        index: '1',
        title: 'Parameters',
        items: [
            {
                defaultValue: 1,
                maximumValue: 2,
                minimumValue: 0,
                name: 'Capacitance (F)',
                stepValue: 0.01,
                value: 0.5
            }
        ]
    }
])

export function provideComponentProperties() {
    componentProperties.value = structuredClone(DEFAULT_PROPERTIES)
    vue.provide('componentProperties', componentProperties)
}

//==============================================================================
//==============================================================================
