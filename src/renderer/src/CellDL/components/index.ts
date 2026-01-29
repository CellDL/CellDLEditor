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

import type { CellDLObject } from '@editor/celldlObjects/index'
import type { MetadataPropertiesMap } from '@renderer/metadata/index'

import type { PointLike } from '@renderer/common/points'
import type { Constructor, StringProperties } from '@renderer/common/types'

//==============================================================================

export interface ObjectTemplate {
    CellDLClass: Constructor<CellDLObject>
    description?: string
    image?: string
    metadataProperties: MetadataPropertiesMap
    name?: string
}

//==============================================================================

export interface LibraryComponentTemplate {
    id: string
    name: string
    image: string
    selected?: boolean
}

export interface ComponentLibrary {
    id: string
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
        details.offset = {
            x: event.offsetX - target.scrollWidth / 2,
            y: event.offsetY - target.scrollHeight / 2
        }
    }
    return details
}

//==============================================================================
//==============================================================================
