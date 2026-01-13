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

import CellDLEditor from '@renderer/components/CellDLEditor.vue'

//==============================================================================

export type EditorData = {
    celldl: string
    kind?: string
}

//==============================================================================

export type EditorEditCommand = {
    command: 'edit'
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

export type EditorViewCommand = {
    command: 'view'
    options: {
        action: string
        value: string|boolean
    }
}

export type CellDLEditorCommand = EditorEditCommand | EditorFileCommand | EditorViewCommand

//==============================================================================

export { CellDLEditor }
export default CellDLEditor

export interface CellDLEditorProps {
    editorCommand: CellDLEditorCommand
}

//==============================================================================
//==============================================================================
