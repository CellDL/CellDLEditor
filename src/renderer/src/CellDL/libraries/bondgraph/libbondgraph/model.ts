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

//==============================================================================

import * as $rdf from '@renderer/metadata'
import type { PredicateType } from '@renderer/metadata'
import { MetadataPropertiesMap, type MetadataPropertyValue } from '@renderer/metadata'
import { BG_NAMESPACE, RDFS_NAMESPACE, XS_NAMESPACE } from '@renderer/metadata'

//==============================================================================

export class ModelValue {
    #name: string
    #value: number
    #units: string = ''
    #description: string = ''

    constructor(name: string, value: number, units: string = '', description: string = '') {
        this.#name = name
        this.#value = value
        this.#units = units
        this.#description = description
    }

    get name() {
        return this.#name
    }

    get value() {
        return this.#value
    }
    set value(value: number) {
        this.#value = value
    }

    get units() {
        return this.#units
    }

    get description() {
        return this.#description
    }

    static fromMetadata(properties: MetadataPropertiesMap): ModelValue {
        //=============================================================
        const modelValue = new ModelValue('', 0)
        for (const [predicate, values] of properties.predicateValues()) {
            if (Array.isArray(values) || values instanceof Set) {
                for (const value of values) {
                    ModelValue.setValue(modelValue, predicate, value)
                }
            } else {
                ModelValue.setValue(modelValue, predicate, values)
            }
        }
        return modelValue
    }

    static setValue(modelValue: ModelValue, predicate: PredicateType, value: MetadataPropertyValue) {
        //=============================================================================================
        if (!(value instanceof MetadataPropertiesMap) && $rdf.isLiteral(value)) {
            if (predicate.equals(BG_NAMESPACE('propertyName'))) {
                modelValue.#name = value.value
            } else if (predicate.equals(BG_NAMESPACE('propertyValue'))) {
                modelValue.#value = +value.value
            } else if (predicate.equals(BG_NAMESPACE('units'))) {
                modelValue.#units = value.value
            } else if (predicate.equals(RDFS_NAMESPACE('comment'))) {
                modelValue.#description = value.value
            }
        }
    }

    metadataProperties(): MetadataPropertiesMap {
        //======================================
        const properties = MetadataPropertiesMap.fromProperties([
            [BG_NAMESPACE('propertyName'), $rdf.literal(this.#name)],
            [BG_NAMESPACE('propertyValue'), $rdf.literal(`${this.#value}`, XS_NAMESPACE('decimal'))]
        ])
        if (this.#units != '') {
            properties.setProperty(BG_NAMESPACE('units'), $rdf.literal(this.#units))
        }
        if (this.#description != '') {
            properties.setProperty(RDFS_NAMESPACE('comment'), $rdf.literal(this.#description))
        }
        return properties
    }
}

//==============================================================================
//==============================================================================
