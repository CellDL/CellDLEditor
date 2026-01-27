<template lang="pug">
    .flex.flex-col.h-full
        main.editor-pane.relative.flex.grow
            EditorToolbar.editor-bar(
                :buttons="toolButtons"
                type="popover"
            )
            div#svg-content(ref="svgContent")
                <!-- context-menu(id="context-menu")  -->
        footer.status-bar
            span#status-msg
            span#status-pos
</template>

<script setup lang="ts">
import * as vue from 'vue'

//==============================================================================

import '../assets/style.css'


import { type EditorToolButton } from '../common/EditorTypes'
import EditorToolbar from './toolbar/EditorToolbar.vue'

import ConnectionStylePopover from './popovers/ConnectionStylePopover.vue'
import { DEFAULT_CONNECTION_STYLE_DEFINITION } from './popovers/ConnectionStylePopover.vue'

//==============================================================================

const svgContent = vue.ref(null)

//==============================================================================

enum EDITOR_TOOL_IDS {
    SelectTool = 'select-tool',
    DrawConnectionTool = 'draw-connection-tool',
    AddComponentTool = 'add-component-tool'
}

const DEFAULT_EDITOR_TOOL_ID = EDITOR_TOOL_IDS.SelectTool


function connectionStylePrompt(name: string): string {
    return `Draw ${name.toLowerCase()} connection`
}

//==============================================================================
//==============================================================================

const toolButtons = vue.ref<EditorToolButton[]>([
    {
        toolId: EDITOR_TOOL_IDS.SelectTool,
        active: (DEFAULT_EDITOR_TOOL_ID as EDITOR_TOOL_IDS) === EDITOR_TOOL_IDS.SelectTool,
        prompt: 'Selection tool',
        icon: 'ci-pointer'
    },
    {
        toolId: EDITOR_TOOL_IDS.DrawConnectionTool,
        active: (DEFAULT_EDITOR_TOOL_ID as EDITOR_TOOL_IDS) === EDITOR_TOOL_IDS.DrawConnectionTool,
        prompt: connectionStylePrompt(DEFAULT_CONNECTION_STYLE_DEFINITION.name),
        icon: DEFAULT_CONNECTION_STYLE_DEFINITION.icon,
        panel: vue.markRaw(ConnectionStylePopover)
    }
])

///==============================================================================

function resetToolBars() {
    // Set the toolbar to its default tool

    for (const toolButton of toolButtons.value) {
        toolButton.active = (DEFAULT_EDITOR_TOOL_ID as EDITOR_TOOL_IDS) === toolButton.toolId
    }
}

//==============================================================================
//==============================================================================

import type {
    CellDLEditorProps,
    EditorData,
    EditorEditCommand,
    EditorFileCommand,
    EditorViewCommand
} from '../../index'

const props = defineProps<CellDLEditorProps>()

//==============================================================================
//==============================================================================
</script>

<style scoped>
.editor-pane {
    min-height: calc(100% - 1.6em);
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
    width: 250px;
    border: 2px solid grey;
    border-left-width: 1px;
    right: 38px; /* This depends on panel bar width... */
    top: 0px;
    bottom: 1.6em;
    position: absolute;
}
.hidden {
    display: none;
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
</style>
