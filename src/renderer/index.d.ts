import type { Component } from 'vue'

import type { CellDLEditorProps } from './index.ts'

export type { CellDLEditorCommand, CellDLEditorProps, Theme } from './index.ts'
export type {
    EditorEditCommand,
    EditorExportCommand,
    EditorFileCommand,
    EditorSetStateCommand,
    EditorViewCommand
} from './index.ts'
export type { EditorData, EditorState, ViewState } from './index.ts'

export declare const CellDLEditor: Component<CellDLEditorProps>
export default CellDLEditor
