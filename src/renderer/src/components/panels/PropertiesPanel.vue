<template lang="pug">
    ToolPanel(:id=toolId)
        template(#content)
            Accordion(value="0")
                AccordionPanel.group(
                    v-for="(group, groupIndex) in groups"
                    :key="group.title"
                    :value="String(groupIndex)")
                    AccordionHeader {{ group.title }}
                    AccordionContent
                        InputWidget(
                            v-for="(input, index) in group.items"
                            v-model="inputValues[groupIndex].values[index]"
                            :key="`input_${groupIndex}_${index}`"
                            :name="input.name"
                            :maximumValue="input.maximumValue"
                            :minimumValue="input.minimumValue"
                            :possibleValues="input.possibleValues"
                            :stepValue="input.stepValue"
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

const groups: vue.Ref<PropertyGroup[]> = vue.inject('componentProperties')

interface GroupInputValues {
    values: (number | string)[]
}

const inputValues = vue.ref<GroupInputValues[]>()

// @ts-expect-error: Somehow `groups` has lost its typing...
inputValues.value = groups.value.map(group => {
// @ts-expect-error: Somehow `group` has lost its typing...
    return { values: group.items.map(item => item.value) }
})

function updateProperties() {

}
</script>

<style>
/* Allow for FloatLabel text of InputWidget */
.p-accordioncontent-content {
    padding-top: 8px !important;
}
</style>
