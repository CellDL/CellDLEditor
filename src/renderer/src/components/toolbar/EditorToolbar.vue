<template lang="pug">
    Toolbar.vertical
        template(#start)
            ToolButton(
                v-for="button in buttons"
                :toolId="button.toolId"
                :active="button?.active"
                :prompt="button.prompt"
                :icon="button.icon"
                :image="button.image"
                :modal="!!button?.panel"
                :type="type"
                :panel="button.panel"
                @button-event="buttonEvent"
            )
                component(
                    v-if="type === 'popover' && button.panel"
                    :is="button.panel"
                    :toolId="button.toolId"
                    @popover-event="popoverEvent"
                )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { type EditorToolButton } from '@renderer/common/EditorTypes'

const props = defineProps<{
    type?: string
    buttons: EditorToolButton[]
}>()

const emit = defineEmits(['button-event', 'popover-event'])

function buttonEvent(toolId: string, active: boolean, panel: vue.Raw<vue.Component> | null) {
    for (const button of props.buttons) {
        if (active && toolId === button.toolId) {
            button.active = true
        } else {
            button.active = false
        }
    }
    emit('button-event', toolId, active, props.type == 'panel' ? panel : null)
}

function popoverEvent(id: string, data: any) {
    emit('popover-event', id, data)
}
</script>

<style>
.p-toolbar.vertical,
.p-toolbar.vertical > .p-toolbar-start {
    flex-direction: column !important;
    width: 38px !important;
    padding: 0 !important;
    border-top: 1px solid grey;
    flex-wrap: nowrap !important;
    border-radius: 0 !important;
}
</style>
