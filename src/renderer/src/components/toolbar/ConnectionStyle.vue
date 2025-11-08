<template lang="pug">
    ToolPanel
        template(#title) Path Style
        template(#content)
            Select(
                v-model="selectedItem"
                :options="items"
                optionLabel="label"
                checkmark
                @change="changed")
                template(#value="slotProps")
                    .flex.items-center(v-if="slotProps.value")
                        span.icon(:class="[slotProps.value.icon]") &nbsp;
                        span {{ slotProps.value.label }}
                    span(v-else) {{ slotProps.placeholder }}
                template(option="slotProps")
                    .flex.items-center
                        span.icon(:class="[slotProps.option.icon]") &nbsp;
                        span {{ slotProps.option.label }}
</template>

<script setup lang="ts">
import * as vue from "vue"

// @ts-expect-error: used in template
import Select from 'primevue/select'

// @ts-expect-error: used in template
import ToolPanel from './ToolPanel.vue'

const selected = 'rectilinear'
const items = vue.computed(() => [
    { label: 'Linear', icon: 'ci ci-linear-connection', code: "linear" },
    { label: 'Rectilinear', icon: 'ci ci-rectilinear-connection', code:"rectilinear" },
]);
const selectedItem = vue.ref()

for (const item of items.value) {
    if (item.code === selected) {
        selectedItem.value = item
        break
    }
}

const emit = defineEmits(['change'])

// @ts-expect-error: used in template
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

