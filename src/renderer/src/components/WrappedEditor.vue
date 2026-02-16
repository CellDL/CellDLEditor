<template lang="pug">
    CellDLEditor.grow(
        :editorCommand="editorCommand"
        :theme="theme"
        @editorData="onEditorData"
        @error="onError"
    )
</template>

<script setup lang="ts">
import * as vue from 'vue'

// Load oxigraph's WASM module before the editor is imported
import initOxigraph from '@oxigraph/web.js'
import * as oxigraph from '@oxigraph/web.js'

import { componentLibraryPlugin } from '@renderer/plugins/index'
import { BondgraphPlugin } from '@renderer/plugins/bondgraph/index'

const crtInstance = vue.getCurrentInstance();

const CellDLEditor = vue.defineAsyncComponent(async () => {
    const wasm = await initOxigraph()
    globalThis.oxigraph = oxigraph

    if (crtInstance) {
        const app = crtInstance.appContext.app;

        // Install our component library plugin manager and the Bondgraph plugin

        componentLibraryPlugin.install(app, {})
        componentLibraryPlugin.registerPlugin(new BondgraphPlugin())
    }

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
