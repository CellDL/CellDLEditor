<template lang="pug">
    BlockUI.overflow-hidden.editor-window(
        ref="blockUi"
        :blocked="compUiBlocked"
        :class="blockUiClass"

        @click="activateInstance"
        @focus="activateInstance"
        @focusin="activateInstance"
        @keydown="activateInstance"
        @mousedown="activateInstance")
        MainMenu(
            :id="mainMenuId"
            v-if="electronApi === undefined"
            @about="onAboutMenu"
            @settings="onSettingsMenu")
        CellDLEditor
</template>

<script setup lang="ts">
import CellDLEditor from '@renderer/components/CellDLEditor.vue'  // is this import needed??
import '@renderer/assets/icons.css'

import primeVueAuraTheme from '@primeuix/themes/aura'
import * as vueusecore from '@vueuse/core'

import 'primeicons/primeicons.css'
import primeVueConfig from 'primevue/config'
import primeVueConfirmationService from 'primevue/confirmationservice'
import primeVueToastService from 'primevue/toastservice'
import { useToast } from 'primevue/usetoast'
import * as vue from 'vue'

import type { IEditorProps } from '../..'

import '@renderer/assets/app.css'
import { SHORT_DELAY, TOAST_LIFE } from '@renderer/common/constants'
import { electronApi } from '@renderer/common/electronApi'
import * as vueCommon from '@renderer/common/vueCommon'

const props = defineProps<IEditorProps>()

const blockUi = vue.ref<vue.ComponentPublicInstance | null>(null)
const toastId = vue.ref('editorToast')
const mainMenuId = vue.ref('editorMainMenu')
const files = vue.ref<HTMLElement | null>(null)
const activeInstanceUid = vueCommon.activeInstanceUid()

// Keep track of which instance of the CellDL Editor is currently active.

function activateInstance(): void {
    activeInstanceUid.value = String(crtInstance?.uid)
}

// Determine if the component UI should be enabled.

const compUiBlocked = vue.computed(() => {
    return !uiEnabled.value || loadingEditorMessageVisible.value
})

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

    if (app.config.globalProperties.$confirm === undefined) {
        app.use(primeVueConfirmationService as unknown as vue.Plugin)
    }

    if (app.config.globalProperties.$toast === undefined) {
        app.use(primeVueToastService as unknown as vue.Plugin)
    }
}

if (props.theme !== undefined) {
    vueCommon.useTheme().setTheme(props.theme)
}

const toast = useToast()

// Handle an action.

electronApi?.onAction((action: string) => {
    handleAction(action)
})

function handleAction(action: string): void {
    function isAction(actionName: string, expectedActionName: string): boolean {
        return actionName.localeCompare(expectedActionName, undefined, { sensitivity: 'base' }) === 0
    }

    const index = action.indexOf('/')
    const actionName = index !== -1 ? action.substring(0, index) : action
    const actionArguments = index !== -1 ? action.substring(index + 1) : ''

    if (isAction(actionName, 'openAboutDialog')) {
        onAboutMenu()
    } else if (isAction(actionName, 'openSettingsDialog')) {
        onSettingsMenu()
    } else {
        const filePaths = actionArguments.split('%7C')

        if (
            (isAction(actionName, 'openFile') && filePaths.length === 1) ||
            (isAction(actionName, 'openFiles') && filePaths.length > 1)
        ) {
            for (const filePath of filePaths) {
                openFile(filePath)
            }
        } else {
            toast.add({
                severity: 'error',
                group: toastId.value,
                summary: 'Handling an action',
                detail: `${action}\n\nThe action could not be handled.`,
                life: TOAST_LIFE
            })
        }
    }
}

// Enable/disable the UI.

const uiEnabled = vue.ref<boolean>(true)

electronApi?.onEnableDisableUi((enable: boolean) => {
    uiEnabled.value = enable
})

// Loading the editor.
//
// locApi --> oxigraph??
//
// Note: this is only done if window.locApi is not defined, which means that we are running the Editor's Web app.

const loadingEditorMessageVisible = vue.ref<boolean>(false)

/**
// @ts-expect-error (window.locApi may or may not be defined which is why we test it)
if (window.locApi === undefined) {
    loadingEditorMessageVisible.value = true

    vue.watch(locApiInitialised, (newLocApiInitialised: boolean) => {
        if (newLocApiInitialised) {
            loadingEditorMessageVisible.value = false
        }
    })
}
**/

// Auto update.

electronApi?.onCheckForUpdates(() => {
    electronApi?.checkForUpdates(false)
})

const updateErrorVisible = vue.ref<boolean>(false)
const updateErrorTitle = vue.ref<string>('')
const updateErrorIssue = vue.ref<string>('')

function onUpdateErrorDialogClose(): void {
    updateErrorVisible.value = false
    updateDownloadProgressVisible.value = false
}

const updateAvailableVisible = vue.ref<boolean>(false)
const updateDownloadProgressVisible = vue.ref<boolean>(false)
const updateVersion = vue.ref<string>('')
const updateDownloadPercent = vue.ref<number>(0)

electronApi?.onUpdateAvailable((version: string) => {
    updateAvailableVisible.value = true
    updateVersion.value = version
})

function onDownloadAndInstall(): void {
    updateDownloadPercent.value = 0 // Just to be on the safe side.
    updateDownloadProgressVisible.value = true
    updateAvailableVisible.value = false

    electronApi?.downloadAndInstallUpdate()
}

electronApi?.onUpdateDownloadError((issue: string) => {
    updateErrorTitle.value = 'Downloading Update...'
    updateErrorIssue.value = `An error occurred while downloading the update (${issue}).`
    updateErrorVisible.value = true
})

electronApi?.onUpdateDownloadProgress((percent: number) => {
    updateDownloadPercent.value = percent
})

electronApi?.onUpdateDownloaded(() => {
    updateDownloadPercent.value = 100 // Just to be on the safe side.

    electronApi?.installUpdateAndRestart()
})

const updateNotAvailableVisible = vue.ref<boolean>(false)

electronApi?.onUpdateNotAvailable(() => {
    updateNotAvailableVisible.value = true
})

electronApi?.onUpdateCheckError((issue: string) => {
    updateErrorTitle.value = 'Checking For Updates...'
    updateErrorIssue.value = `An error occurred while checking for updates (${issue}).`
    updateErrorVisible.value = true
})

// About dialog.

const aboutVisible = vue.ref<boolean>(false)

electronApi?.onAbout(() => {
    onAboutMenu()
})

function onAboutMenu(): void {
    aboutVisible.value = true
}

// Settings dialog.

const settingsVisible = vue.ref<boolean>(false)

electronApi?.onSettings(() => {
    onSettingsMenu()
})

function onSettingsMenu(): void {
    settingsVisible.value = true
}

// Open a file.

function openFile(_fileOrFilePath: string | File): void {
    // Check whether the file is already open and if so then select it.
    /*
  const filePath = locCommon.filePath(fileOrFilePath)

  if (contents.value?.hasFile(filePath) ?? false) {
    contents.value?.selectFile(filePath)

    return
  }
*/
}

// Open file(s) dialog.

function onChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files

    if (files !== null) {
        for (const file of Array.from(files)) {
            openFile(file)
        }
    }
}

// Drag and drop.

const dragAndDropCounter = vue.ref<number>(0)

function onDragEnter(): void {
    if (!uiEnabled.value) {
        return
    }

    dragAndDropCounter.value += 1
}

function onDrop(event: DragEvent): void {
    if (dragAndDropCounter.value === 0) {
        return
    }

    dragAndDropCounter.value = 0

    const files = event.dataTransfer?.files

    if (files !== undefined) {
        for (const file of Array.from(files)) {
            openFile(file)
        }
    }
}

function onDragLeave(): void {
    if (dragAndDropCounter.value === 0) {
        return
    }

    dragAndDropCounter.value -= 1
}

// Reset all.

const resetAllVisible = vue.ref<boolean>(false)

electronApi?.onResetAll(() => {
    resetAllVisible.value = true
})

function onResetAll(): void {
    electronApi?.resetAll()
}

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

    toastId.value = `editorToast${String(crtInstance?.uid)}`
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

    // Ensure that our toasts are shown within our block UI.

    setTimeout(() => {
        const toastElement = document.getElementById(toastId.value)

        if (toastElement !== null) {
            blockUiElement.appendChild(toastElement)
        }
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

// A few additional things that can only be done when the component is mounted.

vue.onMounted(() => {
    // Do what follows with a bit of a delay to give our background time to be renderered.

    setTimeout(() => {
        if (electronApi !== undefined) {
            // Check for updates.
            // Note: the main process will actually check for updates if requested and if the editor is packaged.

            electronApi.checkForUpdates(true)
        } else {
            // Handle the action passed to our Web app, if any.
            // Note: to use vue.nextTick() doesn't do the trick, so we have no choice but to use setTimeout().
            /**
            vue.watch(locApiInitialised, (newLocApiInitialised: boolean) => {
                if (newLocApiInitialised) {
                    const action = vueusecore.useStorage('action', '')

                    if (window.location.search !== '') {
                        action.value = window.location.search.substring(1)

                        window.location.search = ''
                    }
                }
            })
**/
        }
    }, SHORT_DELAY)
})

// Ensure that our BlockUI mask is removed when the UI is enabled.
// Note: this is a workaround for a PrimeVue BlockUI issue when handling an action passed to our Web app.

vue.watch(compUiBlocked, (newCompUiBlocked: boolean) => {
    if (!newCompUiBlocked) {
        setTimeout(() => {
            const blockUiElement = blockUi.value?.$el as HTMLElement
            const maskElement = blockUiElement.querySelector('.p-blockui-mask')

            if (maskElement !== null && maskElement.parentElement === blockUiElement) {
                blockUiElement.removeChild(maskElement)
            }
        }, SHORT_DELAY)
    }
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
