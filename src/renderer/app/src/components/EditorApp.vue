<template lang="pug">
    BlockUI.overflow-hidden
        .h-dvh.flex.flex-col
            .flex
            CellDLEditor.grow(
                :editorCommand="editorCommand"
            )
</template>

<script setup lang="ts">
import * as vue from 'vue'
import * as vueusecore from '@vueuse/core'

import 'primeicons/primeicons.css'
import primeVueAuraTheme from '@primeuix/themes/aura'
import primeVueConfig from 'primevue/config'

//==============================================================================

import '../assets/app.css'
import * as vueCommon from '../common/vueCommon'

//==============================================================================

import CellDLEditor from '../../../index'
import type { CellDLEditorCommand, EditorData } from '../../../index'
import type { EditorState, ViewState } from '../../../index'

//==============================================================================

type IEditorAppProps = {
    theme?: string
    noPython?: boolean
}

const props = defineProps<IEditorAppProps>()

//==============================================================================

const loadingMessage = vue.ref<string>('')

//==============================================================================
//==============================================================================

// Get the current Vue app instance to use some PrimeVue plugins and VueTippy.
// Setup PrimeVue confirmation service

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

const windowTitle = vue.ref<string>('New file')

const fileStatus = vue.ref<{
    haveData: boolean
    modified: boolean
}>({
    haveData: false,
    modified: false
})

</script>
