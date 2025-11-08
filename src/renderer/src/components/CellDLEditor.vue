<template lang="pug">
    main.editor-pane
        EditorToolbar.editor-bar#tool-bar(
            :buttons="toolButtons"
            @tool-button="buttonChanged"
            @tool-updated="toolUpdated")
        div#svg-content(ref="svg-content")
            <!-- context-menu(id="context-menu")  -->
        div#panel-content
            <!-- Where an open panel is displayed -->
        cd-panel-bar.editor-bar#panel-bar
    footer.status-bar
        span#status-msg
        span#status-pos
</template>

<script setup lang="ts">

import { electronApi } from '@renderer/common/electronApi'
import * as vue from 'vue'

import {
    type ConnectionStyleDefinition,
    DEFAULT_CONNECTION_STYLE_DEFINITION
} from '@editor/connections'

import { CellDLDiagram } from '@editor/diagram'

import { CellDLEditor } from '@renderer/components/editor'
import { editGuides } from '@renderer/components/editor/editguides'
import { undoRedo } from '@renderer/components/editor/undoredo'

import { type IToolButton } from '@renderer/components/toolbar'
import EditorToolbar from '@renderer/components/toolbar/EditorToolbar.vue'
import ConnectionStylePanel from '@renderer/components/toolbar/ConnectionStyle.vue'

//==============================================================================

const currentConnectionStyle = vue.ref(DEFAULT_CONNECTION_STYLE_DEFINITION)

function connectionStylePrompt(name: string): string {
    return `Draw ${name.toLowerCase()} connection`
}

const toolButtons = vue.ref<IToolButton[]>([
    {
        id: 'tool1',
        prompt: 'Draw linear connection',
        icon: 'ci-linear-connection'
    },
    {
        id: 'tool2',
        active: true,
        prompt: connectionStylePrompt(currentConnectionStyle.value.name),
        icon: currentConnectionStyle.value.icon,
        panel: vue.shallowRef(ConnectionStylePanel)
    }
])

function buttonChanged(buttonId: string, active: boolean) {
    console.log('bc', buttonId, active)

    // This needs to update editor's drawing mode...
}

function toolUpdated(toolId: string, data: any) {
    if (toolId === 'tool2') {
        currentConnectionStyle.value = data
        toolButtons.value[1]!.prompt = connectionStylePrompt(data.name)
        toolButtons.value[1]!.icon = data.icon

        // Tell editor style has changed
        document.dispatchEvent(
            new CustomEvent('update-connection-tool', {
                detail: {
                    style: data.id
                }
            })
        )
    } else if (toolId === 'tool3') {
/*
        // Tell editor about the default component in the toolbar
        const event = templateImageEvent(this.#currentComponentIcon)
        event.uri = defaultComponentUri
        document.dispatchEvent(
            new CustomEvent('component-selected', {
                detail: event
            })
        )

*/
    }
}

//==============================================================================
//==============================================================================

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
