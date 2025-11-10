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
                @change="buttonChange")
                component(
                    v-if="button.panel"
                    :is="button.panel"
                    :id="button.id"
                    @change="panelChange")
</template>

<script setup lang="ts">
import { type IToolButton } from '.'

const props = defineProps<{
    type?: string
    buttons: IToolButton[]
}>()

const emit = defineEmits(['button-event', 'panel-event'])

function buttonChange(id: string, active: boolean) {
    for (const button of props.buttons) {
        if (active && id === button.id) {
            button.active = true
        } else {
            button.active = false
        }
    }
    emit('button-event', id, active)
}

function panelChange(id: string, data: any) {
    emit('panel-event', id, data)
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
