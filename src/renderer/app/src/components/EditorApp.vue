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
                    @close-file="onCloseFile"
                    @open-file="onOpenFile"
                    @save-cellml="onSaveCellML"
                    @save-file="onSaveFile"
                    @save-file-as="onSaveFileAs"
                )
                div.flex-grow.text-center.font-bold {{ windowTitle }}
            ConfirmDialog
            CellDLEditor.grow(
                :fileAction="fileAction"
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

import type { IEditorProps } from '../../index'
import AboutDialog from './dialogs/AboutDialog.vue'

import { SHORT_DELAY } from '../../../src/common/constants'
import * as vueCommon from '../../../src/common/vueCommon'

import '../assets/app.css'
import '../assets/icons.css'

import { rdfTest, testBg2cellml } from '../../../src/bg2cellml/index'

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

const beforeUnloadHandler = (event: Event) => {
    event.preventDefault()
}

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

const fileAction = vue.ref<{
    action: string
    contents: string|undefined
    fileHandle: FileSystemHandle|undefined
    name: string|undefined
}>()

const confirm = useConfirm()

//==============================================================================

vueusecore.useEventListener(document, 'file-edited', (_: Event) => {
    fileStatus.value.haveData = true
    diagramModified(true)
    if (!windowTitle.value.endsWith(' *')) {
        windowTitle.value += ' *'
    }
})

//==============================================================================

async function onCloseFile() {
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
    fileAction.value = {
        action: 'close-file'
    }
    fileAction.value.fileHandle = undefined
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
        const handle = fileHandles[0]
        const file = await handle.getFile()
        const contents = await file.text()
        fileAction.value = {
            action: 'open-file',
            fileHandle: handle,
            name: handle.name,
            contents: contents
        }
        fileStatus.value.haveData = true
        diagramModified(false)
        windowTitle.value = handle.name
    }
}

//==============================================================================

async function onSaveFile() {
    if (fileAction.value.fileHandle) {
        fileAction.value = {
            ...fileAction.value,
            action: 'save-file'
        }
        diagramModified(false)
        windowTitle.value = fileAction.value.fileHandle.name
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
    const handle = await window.showSaveFilePicker(options).catch(() => {})
    if (handle) {
        fileAction.value = {
            action: 'save-file',
            fileHandle: handle,
            name: handle.name
        }
        diagramModified(false)
        windowTitle.value = handle.name
    }
}

//==============================================================================

async function onSaveCellML() {
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
    const handle = await window.showSaveFilePicker(options).catch(() => {})
    if (handle) {
        fileAction.value = {
            action: 'save-cellml',
            fileHandle: handle,
            name: `https://celldl.org/cellml/${handle.name}`,
        }
    }
}

async function testCellML() {
//    await rdfTest()
    await testBg2cellml()
}

//==============================================================================

// About dialog.

const aboutVisible = vue.ref<boolean>(false)

function onAboutMenu(): void {
  aboutVisible.value = true
}

//==============================================================================

    }








</script>
