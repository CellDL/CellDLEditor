import CellDLEditor from '@renderer/components/CellDLEditor.vue'

export interface CellDLEditorProps {
    fileAction: {
        action: string
        contents: string|undefined
        fileHandle: FileSystemHandle|undefined
        name: string|undefined
    }
}

export { CellDLEditor }
export default CellDLEditor
