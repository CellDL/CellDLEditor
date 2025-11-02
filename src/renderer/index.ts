import EditorApp from './src/components/EditorApp.vue'

export type Theme = 'light' | 'dark' | 'system'

export interface IEditorProps {
    theme?: Theme
}

export { EditorApp }
export default EditorApp
