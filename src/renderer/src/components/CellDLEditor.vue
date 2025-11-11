<template lang="pug">
    main#editor-pane.editor-pane
        EditorToolbar.editor-bar(
            :buttons="toolButtons"
            type="popover"
            @button-event="buttonEvent"
            @popover-event="popoverEvent")
        div#svg-content(ref="svg-content")
            <!-- context-menu(id="context-menu")  -->
        #panel-content(
            :class="{ hidden: !panelVisible }")
            component(
                    v-if="panelComponent"
                    :is="panelComponent"
                    :toolId="panelToolId")
        EditorToolbar.editor-bar(
            :buttons="panelButtons"
            type="panel"
            @button-event="buttonEvent")
    footer.status-bar
        span#status-msg
        span#status-pos
</template>

<script setup lang="ts">
import { electronApi } from '@renderer/common/electronApi'
import * as vue from 'vue'

import { DEFAULT_EDITOR_TOOL_ID, EDITOR_TOOL_IDS } from '@editor/editor/index'

import { DEFAULT_CONNECTION_STYLE_DEFINITION } from '@editor/connections/index'
import { provideComponentProperties } from '@editor/components/properties'

import { CellDLDiagram } from '@editor/diagram/index'

import { CellDLEditor } from '@editor/editor/index'
import { editGuides } from '@editor/editor/editguides'
import { undoRedo } from '@editor/editor/undoredo'

import { type IToolButton } from '@renderer/components/toolbar/index'
import EditorToolbar from '@renderer/components/toolbar/EditorToolbar.vue'

import ComponentPopover from '@renderer/components/popovers/ComponentPopover.vue'
import ConnectionStylePopover from '@renderer/components/popovers/ConnectionStylePopover.vue'
import PropertiesPanel from '@renderer/components/panels/PropertiesPanel.vue'

//==============================================================================

const currentConnectionStyle = vue.ref(DEFAULT_CONNECTION_STYLE_DEFINITION)

function connectionStylePrompt(name: string): string {
    return `Draw ${name.toLowerCase()} connection`
}

const toolButtons = vue.ref<IToolButton[]>([
    {
        toolId: EDITOR_TOOL_IDS.SelectTool,
        active: (DEFAULT_EDITOR_TOOL_ID as EDITOR_TOOL_IDS) === EDITOR_TOOL_IDS.SelectTool,
        prompt: 'Selection tool',
        icon: 'ci-pointer'
    },
    {
        toolId: EDITOR_TOOL_IDS.DrawConnectionTool,
        active: (DEFAULT_EDITOR_TOOL_ID as EDITOR_TOOL_IDS) === EDITOR_TOOL_IDS.DrawConnectionTool,
        prompt: connectionStylePrompt(currentConnectionStyle.value.name),
        icon: currentConnectionStyle.value.icon,
        panel: vue.markRaw(ConnectionStylePopover)
    },
    {
        toolId: EDITOR_TOOL_IDS.AddComponentTool,
        active: (DEFAULT_EDITOR_TOOL_ID as EDITOR_TOOL_IDS) === EDITOR_TOOL_IDS.AddComponentTool,
        prompt: 'Add component',
        icon: currentConnectionStyle.value.icon,
        panel: vue.markRaw(ComponentPopover)
    }
])

//==============================================================================

provideComponentProperties()

const panelButtons = vue.ref<IToolButton[]>([
    {
        toolId: 'properties',
        prompt: 'Component properties',
        icon: 'ci-cog',
        panel: vue.markRaw(PropertiesPanel)
    }
])

//==============================================================================

const panelComponent = vue.ref<vue.Raw<vue.Component>>()

const panelVisible = vue.ref<boolean>()
panelVisible.value = false

const panelToolId = vue.ref<string>()

function buttonEvent(toolId: string, active: boolean, component: vue.Raw<vue.Component> | null) {
    if (component) {
        // Update the RH panel to show its current component
        if (active) {
            panelComponent.value = component
            panelToolId.value = toolId
        }
        panelVisible.value = active
    } else {
        // Tell the editor that a popover tool has changed

        document.dispatchEvent(
            new CustomEvent('toolbar-event', {
                detail: {
                    type: 'state',
                    tool: toolId,
                    value: active
                }
            })
        )
    }
}

//==============================================================================

function popoverEvent(toolId: string, data: any) {
    if (toolId === EDITOR_TOOL_IDS.DrawConnectionTool) {
        currentConnectionStyle.value = data
        toolButtons.value[1]!.prompt = connectionStylePrompt(data.name)
        toolButtons.value[1]!.icon = data.icon

        // Tell the editor that the connection style has changed

        document.dispatchEvent(
            new CustomEvent('toolbar-event', {
                detail: {
                    type: 'value',
                    tool: toolId,
                    value: data.id
                }
            })
        )
    } else if (toolId === EDITOR_TOOL_IDS.AddComponentTool) {
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
                        celldlDiagram = new CellDLDiagram(filePath!, data!, editor!, action === 'IMPORT')
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
//==============================================================================
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
    width: 250px;
    border: 2px solid grey;
    border-left-width: 1px;
    right: 38px; /* This depends on panel bar width... */
    top: 0px;
    bottom: 0px;
    position: absolute;
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
