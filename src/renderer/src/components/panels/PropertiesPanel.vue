<template lang="pug">
    ToolPanel(:id=toolId)
        template(#content)
            Accordion(v-model:value="openPanel")
                AccordionPanel.group(
                    v-for="(group, groupIndex) in groups"
                    :key="group.title"
                    :disabled="disabled"
                    :value="String(groupIndex)")
                    AccordionHeader {{ group.title }}
                    AccordionContent
                        InputWidget(
                            v-for="(item, index) in group.items"
                            v-model="item.value"
                            :key="`item_${groupIndex}_${index}`"
                            :name="item.name"
                            :maximumValue="item.maximumValue"
                            :minimumValue="item.minimumValue"
                            :possibleValues="item.possibleValues"
                            :stepValue="item.stepValue"
                            @change="updateProperties"
                            )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import ToolPanel from '../toolbar/ToolPanel.vue'
import InputWidget from '../widgets/InputWidget.vue'

import { type PropertyGroup } from '@editor/components/properties'

const props = defineProps<{
    toolId: string
}>()

const groups = vue.inject<PropertyGroup[]>('componentProperties')

// Remember last opened AccordionPanel

const openPanel = vue.ref<string>('')

const disabled = vue.computed<boolean>(() => {
    for (const group of groups.value) {
        if (group.items.length) {
            return false
        }
    }
    return true
})

const emit = defineEmits(['panel-event'])

function updateProperties() {
    void vue.nextTick().then(() => {
        emit('panel-event', props.toolId)
    })
}
</script>

<style>
/* Allow for FloatLabel text of InputWidget */
.p-accordioncontent-content {
    padding-top: 8px !important;
}
</style>
