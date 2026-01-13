<template lang="pug">
    BlockUI.overflow-hidden
        BackgroundComponent(
            v-show="loadingMessage !== ''"
        )
        BlockingMessageComponent(
            :message="loadingMessage"
            v-show="loadingMessage !== ''"
        )
        .h-dvh.flex.flex-col
            .flex
                MainMenu(
                    :haveFile="haveFile"
                    :fileModified="fileModified"
                    @about="onAboutMenu"
                    @edit-action="onEditAction"
                    @export-action="onExportAction"
                    @file-action="onFileAction"
                )
                div.flex-grow.text-center.font-bold {{ windowTitle }}
            ConfirmDialog
            CellDLEditor.grow(
                :editorCommand="editorCommand"
                @editorData="onEditorData"
            )
            AboutDialog(
                v-model:visible="aboutVisible"
                @close="aboutVisible = false"
            )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import 'primeicons/primeicons.css'
import primeVueAuraTheme from '@primeuix/themes/aura'
import primeVueConfig from 'primevue/config'
import { useConfirm } from "primevue/useconfirm"

import * as vueusecore from '@vueuse/core'

import AboutDialog from './dialogs/AboutDialog.vue'

import { SHORT_DELAY } from '../../../src/common/constants'
import  { CellDLEditor, type CellDLEditorCommand, type EditorData } from '../../../index'

import * as vueCommon from '../../../src/common/vueCommon'

import '../assets/app.css'
import '../assets/icons.css'

type IEditorAppProps = {
    theme?: string
    noPython?: boolean
}

const props = defineProps<IEditorAppProps>()


//==============================================================================

import { loadPyodide } from '@pyodide/pyodide.mjs'
import type { PyodideAPI } from '@pyodide/pyodide'

const loadingMessage = vue.ref<string>('Loading CellDL editor')

// Load Pyodide's WASM module
import { initialisePyodide } from '../../../src/bg2cellml/index'
import { alert } from '../../../src/CellDL/editor/alerts'


console.log('BASE URL:', import.meta.env.BASE_URL)

loadPyodide({
    indexURL: `${import.meta.env.BASE_URL}pyodide/`
}).then(async (pyodide: PyodideAPI) => {
    // Then initialise our Python packages and `bg2cellml` conversion
    await initialisePyodide(pyodide, loadingMessage)
    loadingMessage.value = ''
    alert.info('Editor ready...')
})

const props = defineProps<IEditorProps>()

import { celldl2cellml, rdfTest, testBg2cellml } from '../../../src/bg2cellml/index'

async function testCellML() {
    await testBg2cellml()
}

}

// Get the current Vue app instance to use some PrimeVue plugins.

const crtInstance = vue.getCurrentInstance()

if (crtInstance !== null) {
    const app = crtInstance.appContext.app

    if (app.config.globalProperties.$primevue === undefined) {
        let options = {}

        if (props.theme === 'light') {
            options = {
                darkModeSelector: false
            }
        } else if (props.theme === 'dark') {
            document.documentElement.classList.add('editor-dark-mode')
            document.body.classList.add('editor-dark-mode')

            options = {
                darkModeSelector: '.editor-dark-mode'
            }
        }

        app.use(primeVueConfig as unknown as vue.Plugin, {
            theme: {
                preset: primeVueAuraTheme,
                options: options
            }
        })
    }
}

if (props.theme !== undefined) {
    vueCommon.useTheme().setTheme(props.theme)
}

//==============================================================================
//==============================================================================

const editorCommand = vue.ref<CellDLEditorCommand>({
    command: ''
})

//==============================================================================
//==============================================================================

const beforeUnloadHandler = (event: Event) => {
    event.preventDefault()
}

let currentFileHandle: FileSystemFileHandle|undefined

const windowTitle = vue.ref<string>('New file')

const fileStatus = vue.ref<{
    haveData: boolean
    modified: boolean
}>({
    haveData: false,
    modified: false
})

function diagramModified(modified: boolean) {
    fileStatus.value.modified = modified
    if (modified) {
        window.addEventListener("beforeunload", beforeUnloadHandler)
    } else {
        window.removeEventListener("beforeunload", beforeUnloadHandler)
    }
}

const haveFile = vue.computed(() => {
    return fileStatus.value.haveData
})

const fileModified = vue.computed(() => {
    return fileStatus.value.modified
})

//==============================================================================

const confirm = useConfirm()

//==============================================================================

vueusecore.useEventListener(document, 'file-edited', (_: Event) => {
    fileStatus.value.haveData = true
    diagramModified(true)
    if (!windowTitle.value.endsWith(' *')) {
        windowTitle.value += ' *'
    }
})

async function onEditorData(data: EditorData) {
    if (data.kind === 'export') {
        await saveCellML(data.celldl)

    } else if (currentFileHandle) {
        // but when new file there is no CFH...
        const writable = await currentFileHandle.createWritable()
        await writable.write(data.celldl)
        await writable.close()
        diagramModified(false)
        windowTitle.value = currentFileHandle.name
        editorCommand.value = {
            command: 'edit',
            options: {
                action: 'clean'
            }
        }

    }
}

//==============================================================================
//==============================================================================

async function onFileAction(action: string) {
    if (action === 'new') {
        await onNewFile()
        } else if (action === 'open') {
        await onOpenFile()
    } else if (action === 'save') {
        await onSaveFile()
    } else if (action === 'save-as') {
        await onSaveFileAs()
    }
}

//==============================================================================

async function onNewFile() {
    if (!fileStatus.value.modified) {
        closeFile()
    } else {
        confirm.require({
            message: 'Close modified file?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            rejectProps: {
                label: 'Cancel',
                severity: 'secondary',
                outlined: true
            },
            acceptProps: {
                label: 'Close'
            },
            accept: () => {
                closeFile()
            }
        })
    }
}

function closeFile() {
    editorCommand.value = {
        command: 'file',
        options: {
            action: 'close'
        }
    }
    currentFileHandle = undefined
    fileStatus.value.haveData = false
    diagramModified(false)
    windowTitle.value = 'New file'
}

//==============================================================================

async function onOpenFile() {
    if (!fileStatus.value.modified) {
        await openFile()
    } else {
        confirm.require({
            message: 'Overwrite modified file?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            rejectProps: {
                label: 'Cancel',
                severity: 'secondary',
                outlined: true
            },
            acceptProps: {
                label: 'Open'
            },
            accept: async () => {
                await openFile()
            }
        })
    }
}

async function openFile() {
    const options = {
        excludeAcceptAllOption: true,
        types: [
            {
                description: 'CellDL files',
                accept: {
                    'image/svg+xml': ['.celldl', '.svg'],
                }
            }
        ]
    }
    const fileHandles = await window.showOpenFilePicker(options)
    if (fileHandles.length) {
        currentFileHandle = fileHandles[0]
        if (currentFileHandle) {
            const file = await currentFileHandle.getFile()
            const contents = await file.text()
            editorCommand.value = {
                command: 'file',
                options: {
                    action: 'open',
                    data: contents,
                    name: currentFileHandle.name
                }
            }
            fileStatus.value.haveData = true
            diagramModified(false)
            windowTitle.value = currentFileHandle.name
        }
    }
}

//==============================================================================

async function onSaveFile() {
    if (currentFileHandle) {
        editorCommand.value = {
            command: 'file',
            options: {
                action: 'data'
            }
        }
    } else {
        await onSaveFileAs()
    }
}

async function onSaveFileAs() {
    const options = {
        types: [
            {
                description: 'CellDL files',
                accept: {
                    'image/svg+xml': ['.svg', '.celldl'],
                }
            }
        ]
    }
    const fileHandle = await window.showSaveFilePicker(options).catch(() => {})
    if (fileHandle) {
        editorCommand.value = {
            command: 'file',
            options: {
                action: 'data',
                name: fileHandle.name
            }
        }
        currentFileHandle = fileHandle
    }
}

//==============================================================================
//==============================================================================

async function onExportAction(action: string) {
    if (action === 'cellml') {
        editorCommand.value = {
            command: 'file',
            options: {
                action: 'data',
                kind: 'export'
            }
        }
    }
}

async function saveCellML(celldl: string) {
    const options = {
        types: [
            {
                description: 'CellML files',
                accept: {
                    'application/cellml+xml': ['.cellml'],
                }
            }
        ]
    }
    const fileHandle = await window.showSaveFilePicker(options).catch(() => {})
    if (fileHandle) {
        const cellmlObject = celldl2cellml(`https://celldl.org/cellml/${fileHandle.name}`, celldl)
        if (cellmlObject.cellml) {
            const writable = await fileHandle.createWritable()
            await writable.write(cellmlObject.cellml)
            await writable.close()
        } else if (cellmlObject.issues) {
            window.alert(cellmlObject.issues.join('\n'))
        }
    }
}

//==============================================================================

// About dialog.

const aboutVisible = vue.ref<boolean>(false)

function onAboutMenu(): void {
  aboutVisible.value = true
}

//==============================================================================
//==============================================================================

</script>
