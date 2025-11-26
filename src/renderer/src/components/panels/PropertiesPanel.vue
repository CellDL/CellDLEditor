<template lang="pug">
    ToolPanel(:id=toolId)
        template(#content)
            Accordion(v-model:value="openPanel")
                AccordionPanel.group(
                    v-for="(group, groupIndex) in groups"
                    :key="group.title"
                    :disabled="disabled"
                    :value="String(groupIndex)"
                )
                    AccordionHeader {{ group.title }}
                    AccordionContent
                        InputWidget(
                            v-for="(item, index) in group.items"
                            v-model="item.value"
                            :itemId="item.itemId"
                            :name="item.name"
                            :units="item.units"
                            :numeric="item.numeric"
                            :maximumValue="item.maximumValue"
                            :minimumValue="item.minimumValue"
                            :possibleValues="item.possibleValues"
                            :stepValue="item.stepValue"
                            @change="updateProperties"
                        )
                AccordionPanel.group(
                    key="Styling"
                    :disabled="disabled"
                    value="String(groups.length)"
                )
                    AccordionHeader Fill style
                    AccordionContent
                        FillStyle(
                            :fillStyle="fillStyle"
                            @change="updateFill"
                        )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import { type PropertyGroup } from '@editor/components/properties'

import ToolPanel from '../toolbar/ToolPanel.vue'
import InputWidget from '../widgets/InputWidget.vue'

import FillStyle from './FillStyle.vue'
import { type IFillStyle } from './FillStyle.vue'

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

const fillStyle = vue.ref<IFillStyle>({
    gradientFill: true,
    colours: ['yellow', 'green'],
    direction: 'V'
})

const emit = defineEmits(['panel-event'])

function updateProperties(itemId: string, oldValue: number | string, newValue: number | string) {
    void vue.nextTick().then(() => {
        emit('panel-event', props.toolId, itemId, oldValue, newValue)
    })
}

function updateFill(fillStyle: IFillStyle) {
    console.log('updateFill...', fillStyle)
}
</script>

<style>
/* Allow for FloatLabel text of InputWidget */
.p-accordioncontent-content {
    padding-top: 8px !important;
}
</style>
