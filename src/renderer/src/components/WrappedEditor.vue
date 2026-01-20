<template lang="pug">
    CellDLEditor.grow(
        :editorCommand="editorCommand"
        @editorData="onEditorData"
        @error="onError"
    )
</template>

<script setup lang="ts">
import * as vue from 'vue'

// Load oxigraph's WASM module before the editor is imported
import initOxigraph from '@oxigraph/web.js'
import * as oxigraph from '@oxigraph/web.js'

const CellDLEditor = vue.defineAsyncComponent(async () => {
    const wasm = await initOxigraph()
    globalThis.oxigraph = oxigraph
    return import('./CellDLEditor.vue')
})

import type {
    CellDLEditorProps,
    EditorData
} from '../../index'

const props = defineProps<CellDLEditorProps>()

const emit = defineEmits<{
    'editor-data': [data: EditorData],
    'error': [msg: string]
}>()

function onEditorData(data: EditorData) {
    emit('editor-data', data)
}

function onError(msg: string) {
    emit('error', msg)
}

</script>
