<template lang="pug">
    Toolbar.vertical
        template(#start)
            ToolButton(
                v-for="button in buttons"
                :id="button.id"
                :active="button?.active"
                :prompt="button.prompt"
                :icon="button.icon"
                :modal="!!button?.panel"
                :type="type"
                :panel="button.panel"
                @button-event="buttonEvent")
                component(
                    v-if="type === 'popover' && button.panel"
                    :is="button.panel"
                    :id="button.id"
                    @popover-event="popoverEvent")
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { type IToolButton } from '.'

const props = defineProps<{
    type?: string
    buttons: IToolButton[]
}>()

const emit = defineEmits(['button-event', 'popover-event'])

function buttonEvent(id: string, active: boolean, panel: vue.Raw<vue.Component>|null) {
    for (const button of props.buttons) {
        if (active && id === button.id) {
            button.active = true
        } else {
            button.active = false
        }
    }
    emit('button-event', id, active, props.type == 'panel' ? panel : null)
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
