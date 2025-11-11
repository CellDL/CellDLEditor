<template lang="pug">
    ToolPanel
        template(#content)
            Accordion(value="0")
                AccordionPanel.group(
                    v-for="group in groups"
                    :key="group.title"
                    :value="group.index")
                    AccordionHeader {{ group.title }}
                    AccordionContent
                        InputWidget(
                            v-for="(input, index) in group.items"
                            v-model="inputValues[group.index].values[index]"
                            :key="`input_${group.index}_${index}`"
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

import { componentProperties, type PropertyGroup } from '@editor/components/properties'

const groups = vue.ref<PropertyGroup[]>()
groups.value = <PropertyGroup[]>componentProperties



function updateProperties() {

}
</script>
