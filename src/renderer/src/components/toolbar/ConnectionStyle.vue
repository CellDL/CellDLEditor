<template lang="pug">
    ToolPanel
        template(#title) Path Style
        template(#content)
            Select(
                v-model="selectedItem"
                :options="items"
                optionLabel="label"
                checkmark
                :highlightOnSelect="false"
                @change="changed")
                template(#value="slotProps")
                    .flex.items-center(v-if="slotProps.value")
                        span.ci(:class="[slotProps.value.icon]") &nbsp;
                        span {{ slotProps.value.label }}
                    span(v-else) {{ slotProps.placeholder }}
                template(option="slotProps")
                    .flex.items-center
                        span {{ slotProps.option.label }}
</template>

<script setup lang="ts">
import * as vue from "vue"

import Select from 'primevue/select'

import ToolPanel from './ToolPanel.vue'

const selected = 'rectilinear'
const items = vue.computed(() => [
    { label: 'Linear', icon: 'ci-linear-connection', code: "linear" },
    { label: 'Rectilinear', icon: 'ci-rectilinear-connection', code:"rectilinear" },
]);
const selectedItem = vue.ref()

for (const item of items.value) {
    if (item.code === selected) {
        selectedItem.value = item
        break
    }
}

const emit = defineEmits(['change'])

function changed(e: Event) {
    emit('change', e)
}
</script>

<style scoped>
/* What does `md.w-56` do?? */
.p-select {
    width: 170px !important;
}
</style>

