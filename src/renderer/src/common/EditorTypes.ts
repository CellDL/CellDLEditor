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

import type * as vue from 'vue'

//==============================================================================

export interface EditorToolButton {
    toolId: string
    active?: boolean
    prompt: string
    icon?: string
    image?: string
    panel?: vue.Raw<vue.Component>
}

//==============================================================================

export interface EditorState {
    fileModified?: boolean
    itemSelected?: boolean
    pasteContents?: boolean
    redoContents?: boolean
}

//==============================================================================

export interface ViewState {
    showGrid?: boolean
    gridSpacing?: number
    snapToGrid?: number
}

//==============================================================================
//==============================================================================
