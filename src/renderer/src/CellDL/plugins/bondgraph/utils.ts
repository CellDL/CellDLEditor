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

import type {
    ComponentLibrary,
    LibraryComponentTemplate
} from '@editor/components/index'

import type { BGBaseComponent } from './index'

//==============================================================================

export interface BGElementStyle {
    text: string
    background: string|string[]
    border?: string
}

export interface BGComponentDefinition {
    id: string
    type: string
    name: string
    symbol: string
    style: BGElementStyle,
    noSpeciesLocation?: boolean
}

export type BGLibraryComponentTemplate = LibraryComponentTemplate & {
    type: string
    symbol: string
    noSpeciesLocation?: boolean
    style: BGElementStyle
    component?: BGBaseComponent
}

export type BGComponentLibrary = ComponentLibrary & {
    templates: BGLibraryComponentTemplate[]
}

//==============================================================================
//==============================================================================
