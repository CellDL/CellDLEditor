<template lang="pug">
    ToolPopover
        template(#title) Path Style
        template(#content)
            Select(
                v-model="selectedItem"
                :options="items"
                optionLabel="name"
                checkmark
                :highlightOnSelect="false"
                @change="changed")
                template(#value="slotProps")
                    .flex.items-center(v-if="slotProps.value")
                        span.ci(:class="[slotProps.value.icon]") &nbsp;
                        span {{ slotProps.value.name }}
                    span(v-else) {{ slotProps.placeholder }}
                template(option="slotProps")
                    .flex.items-center
                        span {{ slotProps.option.name }}
</template>

<script setup lang="ts">
import * as vue from "vue"

import Select from 'primevue/select'
import { type SelectChangeEvent } from 'primevue/select'

import ToolPopover from './ToolPopover.vue'

import {
    type ConnectionStyleDefinition,
    CONNECTION_STYLE_DEFINITIONS,
    DEFAULT_CONNECTION_STYLE
} from '@editor/connections'

const selectedId: string = DEFAULT_CONNECTION_STYLE
const items = vue.ref<ConnectionStyleDefinition[]>(CONNECTION_STYLE_DEFINITIONS)

const selectedItem = vue.ref<ConnectionStyleDefinition>()

for (const item of items.value) {
    if (item.id === selectedId) {
        selectedItem.value = item
        break
    }
}

//==============================================================================

const props = defineProps<{
    id: string
}>()

const emit = defineEmits(['popover-event'])

function changed(e: SelectChangeEvent) {
    emit('popover-event', props.id, e.value)
}
</script>

<style scoped>
/* What does `md.w-56` do?? */
.p-select {
    width: 170px !important;
}
</style>

