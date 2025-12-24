<template lang="pug">
    BlockUI.overflow-hidden.editor-window(
        ref="blockUi"
        :blocked="compUiBlocked"
        :class="blockUiClass"

        @click="activateInstance"
        @focus="activateInstance"
        @focusin="activateInstance"
        @keydown="activateInstance"
        @mousedown="activateInstance"
    )
        BackgroundComponent(
            v-show="loadingMessage !== ''"
        )
        BlockingMessageComponent(
            :message="loadingMessage"
            v-show="loadingMessage !== ''"
        )
        div.editor-window
            div.flex
                MainMenu(
                    :id="mainMenuId"
                    :haveFile="haveFile"
                    :fileModified="fileModified"
                    v-if="electronApi === undefined"
                    @about="onAboutMenu"
                    @close-file="onCloseFile"
                    @open-file="onOpenFile"
                    @save-cellml="onSaveCellML"
                    @save-file="onSaveFile"
                    @save-file-as="onSaveFileAs"
                )
                div.flex-grow.text-center.font-bold {{ windowTitle }}
            ConfirmDialog
            CellDLEditor(
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

import { SHORT_DELAY } from '@renderer/common/constants'
import { electronApi } from '@renderer/common/electronApi'
import * as vueCommon from '@renderer/common/vueCommon'

import '@renderer/assets/app.css'
import '@renderer/assets/icons.css'

import { rdfTest, testBg2cellml } from '@renderer/bg2cellml'

//==============================================================================

import { loadPyodide } from '@pyodide/pyodide.mjs'
import type { PyodideAPI } from '@pyodide/pyodide'
import { initialisePyodide } from '@renderer/bg2cellml/index'
import { alert } from '@editor/editor/alerts'

const loadingMessage = vue.ref<string>('Loading CellDL editor')

// Load Pyodide's WASM module


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

const blockUi = vue.ref<vue.ComponentPublicInstance | null>(null)
const mainMenuId = vue.ref('editorMainMenu')
const activeInstanceUid = vueCommon.activeInstanceUid()

// Keep track of which instance of the CellDL Editor is currently active.

function activateInstance(): void {
    activeInstanceUid.value = String(crtInstance?.uid)
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

// A few things that can only be done when the component is mounted.

const blockUiClass = vue.ref('')
const width = vue.ref<number>(0)
const height = vue.ref<number>(0)
const heightMinusMainMenu = vue.ref<number>(0)

vue.onMounted(() => {
    // Set our height to '100vh'/'100dvh' or '100%', depending on whether we are mounted as a Vue application or a Vue
    // component.

    const blockUiElement = blockUi.value?.$el as HTMLElement
    const parentElement = blockUiElement.parentElement
    const grandParentElement = parentElement?.parentElement
    const greatGrandParentElement = grandParentElement?.parentElement
    const greatGreatGrandParentElement = greatGrandParentElement?.parentElement

    blockUiClass.value =
        parentElement?.tagName === 'DIV' &&
        parentElement.id === 'app' &&
        grandParentElement?.tagName === 'BODY' &&
        greatGrandParentElement?.tagName === 'HTML' &&
        greatGreatGrandParentElement === null
            ? 'editor-application'
            : 'editor-component'

    // Customise our IDs.

    mainMenuId.value = `editorMainMenu${String(crtInstance?.uid)}`

    // Make ourselves the active instance.

    setTimeout(() => {
        activateInstance()
    }, SHORT_DELAY)

    // Track the height of our main menu.

    let mainMenuResizeObserver: ResizeObserver | undefined

    setTimeout(() => {
        mainMenuResizeObserver = vueCommon.trackElementHeight(mainMenuId.value)
    }, SHORT_DELAY)

    // Monitor our size.
    // Note: this accounts for changes in viewport size (e.g., when rotating a mobile device).

    window.addEventListener('resize', resizeOurselves)

    vue.onUnmounted(() => {
        window.removeEventListener('resize', resizeOurselves)
    })

    // Monitor our contents size.

    function resizeOurselves() {
        const style = window.getComputedStyle(blockUiElement)

        width.value = parseFloat(style.width)
        height.value = parseFloat(style.height)

        heightMinusMainMenu.value = height.value - vueCommon.trackedCssVariableValue(mainMenuId.value)
    }

    const resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
            resizeOurselves()
        }, SHORT_DELAY)
    })

    let oldMainMenuHeight = vueCommon.trackedCssVariableValue(mainMenuId.value)

    const mutationObserver = new MutationObserver(() => {
        const newMainMenuHeight = vueCommon.trackedCssVariableValue(mainMenuId.value)

        if (newMainMenuHeight !== oldMainMenuHeight) {
            oldMainMenuHeight = newMainMenuHeight

            resizeOurselves()
        }
    })

    resizeObserver.observe(blockUiElement)
    mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })

    vue.onUnmounted(() => {
        resizeObserver.disconnect()
        mutationObserver.disconnect()

        mainMenuResizeObserver?.disconnect()
    })
})

</script>

<style scoped>
.editor-component {
    height: 100%;
}
.editor-window {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
}
</style>
