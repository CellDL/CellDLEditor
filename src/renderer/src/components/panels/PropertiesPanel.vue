<template lang="pug">
    ToolPanel
        template(#title) Element Properties
        template(#content)
            Fieldset(
                v-for="group in groups"
                :legend="group.title")
                InputWidget(
                    v-for="(input, index) in group.items"
                    v-model="input.value"
                    :key="`input_${index}`"
                    :name="input.name"
                    :maximumValue="input.maximumValue"
                    :minimumValue="input.minimumValue"
                    :possibleValues="input.possibleValues"
                    :stepValue="input.stepValue"
                    :class="index !== 0 ? 'mt-6' : ''"
                    @change="updateProperties"
                    )
</template>

<script setup lang="ts">
import * as vue from 'vue'

import type * as locApi from '../../libopencor/locUIJsonApi';

import ToolPanel from '../toolbar/ToolPanel.vue'

import InputWidget from '../widgets/InputWidget.vue'

const props = defineProps<{

}>()


// each group

type ItemDetails = locApi.IUiJsonInput & { value: number|string }

interface PropertyGroup {
    title: string
    items: ItemDetails[]
}

const groups = vue.ref<PropertyGroup[]>()


groups.value = [
    {
        title: 'group 1',
        items: [
            {
                name: 'species',
                value: 'i'
            }
        ]
    },
    {
        title: 'Parameters',
        items: [
            {
                defaultValue: 1,
                maximumValue: 10,
                minimumValue: 0,
                name: 'Capacitance',
                value: 0.5
            }
        ]
    }
]




function updateProperties() {

}
</script>
