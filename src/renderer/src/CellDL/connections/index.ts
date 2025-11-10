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

export enum ConnectionStyle {
    Linear = 'linear',
    Rectilinear = 'rectilinear'
}

export interface ConnectionStyleDefinition {
    id: ConnectionStyle
    icon: string
    name: string
}

//==============================================================================

export const DEFAULT_CONNECTION_STYLE_DEFINITION = {
    id: ConnectionStyle.Rectilinear,
    name: 'Rectilinear',
    icon: 'ci-rectilinear-connection'
}

export const DEFAULT_CONNECTION_STYLE = DEFAULT_CONNECTION_STYLE_DEFINITION.id

export const CONNECTION_STYLE_DEFINITIONS: ConnectionStyleDefinition[] = [
    {
        id: ConnectionStyle.Linear,
        name: 'Linear',
        icon: 'ci-linear-connection'
    },
    DEFAULT_CONNECTION_STYLE_DEFINITION
]

//==============================================================================
//==============================================================================
