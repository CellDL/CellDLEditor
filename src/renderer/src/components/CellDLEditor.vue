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
import { electronApi } from '@renderer/common/electronApi'
import * as vue from 'vue'


import { CellDLDiagram } from '@editor/diagram'
import { CellDLEditor } from './editor'
import { editGuides } from './editor/editguides'
import { undoRedo } from './editor/undoredo'
import editorToolbar from './EditorToolbar.vue'

const editor = new CellDLEditor()
const svgContainer = vue.useTemplateRef('svg-content')

let celldlDiagram: CellDLDiagram | null = null

vue.onMounted(() => {
    if (svgContainer.value) {
        // @ts-expect-error: `svgContainer.value` is a HTMLElement
        editor.mount(svgContainer.value)

        // Create a new diagram in the editor's window
        celldlDiagram = new CellDLDiagram('', '', editor)

        // Listen for events from host when running as an Electron app
        if ('electronApi' in window) {
            electronApi?.onFileAction(async (_, action: string, filePath: string, data: string | undefined) => {
                if (action === 'IMPORT' || action === 'OPEN') {
                    // Load CellDL file (SVG and metadata)
                    try {
                        celldlDiagram = new CellDLDiagram(
                            filePath!,
                            data!,
                            editor!,
                            action === 'IMPORT'
                        )
                    } catch (error) {
                        console.log(error)
                        window.alert((error as Error).toString())
                        electronApi?.sendFileAction('ERROR', filePath)
                        celldlDiagram = new CellDLDiagram('', '', editor!)
                    }
                    editor!.editDiagram(celldlDiagram)
                } else if (action === 'GET_DATA') {
                    const celldlData = await celldlDiagram?.serialise(filePath!)
                    electronApi?.sendFileAction('WRITE', filePath, celldlData)
                    undoRedo.clean()
                }
            })

            electronApi?.onMenuAction((_, action: string, ...args) => {
                if (action === 'menu-redo') {
                    undoRedo.redo(celldlDiagram!)
                } else if (action === 'menu-undo') {
                    undoRedo.undo(celldlDiagram!)
                } else if (action === 'show-grid') {
                    if (args.length) {
                        editGuides.showGrid(args[0])
                    }
                }
            })

            // Let Electron know that the editor's window is ready
            electronApi?.sendEditorAction('READY')
        }

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
</style>
