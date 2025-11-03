import EditorApp from '@renderer/components/EditorApp.vue'

export type Theme = 'light' | 'dark' | 'system'

export interface IEditorProps {
    theme?: Theme
}

export { EditorApp }
export default EditorApp
