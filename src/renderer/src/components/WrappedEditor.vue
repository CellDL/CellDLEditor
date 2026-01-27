<template lang="pug">
    CellDLEditor.grow(
        :editorCommand="editorCommand"
        @editorData="onEditorData"
        @error="onError"
    )
</template>

<script setup lang="ts">
import * as vue from 'vue'

const CellDLEditor = vue.defineAsyncComponent(async () => {
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
