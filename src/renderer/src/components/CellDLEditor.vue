<template>
    <main class="editor-pane">
        <editor-toolbar class="editor-bar" id="tool-bar"></editor-toolbar>

            <context-menu id="context-menu"></context-menu>
        <div ref="svg-content" id="svg-content">
        </div>


        <div id="panel-content"><!--Where an open panel is displayed--></div>
        <cd-panel-bar class="editor-bar" id="panel-bar"></cd-panel-bar>
    </main>
    <footer class="status-bar">
        <span id="status-msg"></span>
        <span id="status-pos"></span>
    </footer>
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { CellDLDiagram } from '@editor/diagram'
import { CellDLEditor } from './editor'
import editorToolbar from './EditorToolbar.vue'

const editor = new CellDLEditor()
const svgContainer = vue.useTemplateRef('svg-content')

let celldlDiagram = null

vue.onMounted(() => {
    if (svgContainer.value) {
        // @ts-expect-error: `svgContainer.value` is a HTMLElement
        editor.mount(svgContainer.value)
        celldlDiagram = new CellDLDiagram('', '', editor)
        celldlDiagram.edit()
    }
})
</script>

<style scoped>
.editor-pane {
    display: flex;
    flex: 1;
    min-height: 0;
    position: relative;
}

.editor-bar {
    width: 40px;
    overflow: auto;
}
#svg-content {
    margin:  0;
    border: 2px solid grey;
    flex: 1;
    overflow: hidden;
}
#panel-content {
    padding:  6px;
    width: 250px;
    border: 2px solid grey;
    display: none;
    right: 38px; /* This depends on panel bar width... */
    top: 0px;
    bottom: 0px;
    position: absolute;
    background-color: #ECECEC;
}
.status-bar {
    min-height: 1.6em;
    border-top: 1px solid gray;
    padding-left: 16px;
    padding-right: 16px;
    background-color: #ECECEC;
}
#status-msg.error {
    color: red;
}
#status-msg.warn {
   color: blue;
}
#status-pos {
    float: right;
}
x-tooltip[type="error"] {
    background: #F88;
}
</style>
