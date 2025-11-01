import Editor from './src/components/Editor.vue'

export type Theme = 'light' | 'dark' | 'system'

export interface IEditorProps {
    theme?: Theme
}

export { Editor }
export default Editor
