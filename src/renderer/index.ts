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

import CellDLEditor from '@renderer/components/WrappedEditor.vue'
export { DEFAULT_VIEW_STATE } from '@editor/editor/editguides'

export { version } from './package.json'

//==============================================================================

export type EditorData = {
    data: string
    kind?: string
}

//==============================================================================

export type EditorEditCommand = {
    command: 'edit'
    options: {
        action: string
    }
}

export type EditorEmptyCommand = {
    command: ''
    options?: object
}

export type EditorExportCommand = {
    command: 'export'
    options: {
        action: string
    }
}

export type EditorFileCommand = {
    command: 'file'
    options: {
        action: string
        data?: string
        kind?: string
        name?: string
    }
}

export type EditorSetStateCommand = {
    command: 'set-state'
    options: {
        action: string
    }
}

export type EditorViewCommand = {
    command: 'view'
    options: ViewState
}

export type CellDLEditorCommand = EditorEditCommand
                                | EditorEmptyCommand
                                | EditorExportCommand
                                | EditorFileCommand
                                | EditorSetStateCommand
                                | EditorViewCommand

import type { ViewState } from '@renderer/common/EditorTypes'
export type { EditorState, ViewState } from '@renderer/common/EditorTypes'

//==============================================================================

export type Theme = 'light' | 'dark' | 'system';

//==============================================================================

export { CellDLEditor }
export default CellDLEditor

export interface CellDLEditorProps {
    editorCommand: CellDLEditorCommand,
    theme?: Theme
}

import { celldl2cellml, initialisePython } from '@renderer/bg2cellml/index'
export { celldl2cellml, initialisePython }

//==============================================================================
//==============================================================================
