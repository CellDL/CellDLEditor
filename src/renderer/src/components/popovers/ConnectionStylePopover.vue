<template lang="pug">
    ToolPopover
        template(#title) Path Style
        template(#content)
            Select(
                v-model="selectedItem"
                :options="items"
                optionLabel="name"
                :highlightOnSelect="true"
                @change="changed"
            )
                template(#value="slotProps")
                    .flex.items-center(v-if="slotProps.value")
                        span.ci(:class="[slotProps.value.icon]") &nbsp;
                        span {{ slotProps.value.name }}
                    span(v-else) {{ slotProps.placeholder }}
                template(#option="slotProps")
                    .flex.items-center
                        span {{ slotProps.option.name }}
</template>

<script lang="ts">
export enum ConnectionStyle {
    Linear = 'linear',
    Rectilinear = 'rectilinear'
}

export interface ConnectionStyleDefinition {
    id: ConnectionStyle
    icon: string
    name: string
}

export const DEFAULT_CONNECTION_STYLE_DEFINITION = {
    id: ConnectionStyle.Rectilinear,
    name: 'Rectilinear',
    icon: 'ci-rectilinear-connection'
}

export const DEFAULT_CONNECTION_STYLE = DEFAULT_CONNECTION_STYLE_DEFINITION.id

export const CONNECTION_STYLE_DEFINITIONS: ConnectionStyleDefinition[] = [
    {
        id: ConnectionStyle.Linear,
        name: 'Linear',
        icon: 'ci-linear-connection'
    },
    DEFAULT_CONNECTION_STYLE_DEFINITION
]
</script>

<script setup lang="ts">
import * as vue from 'vue'

import Select from 'primevue/select'
import { type SelectChangeEvent } from 'primevue/select'
import { useThemeFix } from '@renderer/common/themeVariablesFix'
useThemeFix('select')

import ToolPopover from '../toolbar/ToolPopover.vue'

//==============================================================================
//==============================================================================

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
    toolId: string
}>()

const emit = defineEmits(['popover-event'])

function changed(e: SelectChangeEvent) {
    emit('popover-event', props.toolId, e.value)
}

//==============================================================================
</script>

<style scoped>
/* What does `md.w-56` do?? */
.p-select {
    width: 170px !important;
}
</style>

