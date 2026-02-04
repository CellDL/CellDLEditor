<template lang="pug">
    .card
        .flexPrompt
            label(for="colour") Path colour
            input.colour#colour(
                type="color"
                :value="pathColour"
                @input="colourChange"
            )
        .spacer
        FloatLabel(variant="on")
            InputText(v-model.number="width")
            Slider(
                v-model="width"
                :min="minWidth"
                :max="maxWidth"
                :step="widthStep"
                @change="emitChange"
            )
            label Width (px)
        .spacer
        .flexPrompt
            label(for="dashed") Dashed:
            Checkbox#gradientCheckbox(
                v-model="dashed"
                binary
                @change="emitChange"
            )
</template>

<script setup lang="ts">
import * as vue from 'vue'
import Slider from 'primevue/slider'
import { TinyColor } from '@ctrl/tinycolor'

import { useThemeCssVariables } from '@renderer/common/themeCssVariables'
useThemeCssVariables('slider')

import { type IPathStyle } from '@renderer/common/svgUtils'

const props = defineProps<{
    pathStyle: IPathStyle
}>()

const colour = vue.ref(props.pathStyle.colour)
const dashed = vue.ref(props.pathStyle.dashed)
const width = vue.ref(props.pathStyle.width)

const minWidth = vue.ref<number>(0.5)
const maxWidth = vue.ref<number>(10)
const widthStep = vue.ref<number>(0.5)

vue.watch(
    () => props.pathStyle,
    () => {
        colour.value = props.pathStyle.colour
        dashed.value = props.pathStyle.dashed
        width.value = props.pathStyle.width
    }
)

const pathColour = vue.computed<string>(() => {
    return new TinyColor(colour.value).toHexString()
})

function colourChange(e: Event) {
    const target = e.target as HTMLInputElement
    colour.value = target.value
    emitChange()
}

const emit = defineEmits(['change'])

function emitChange() {
    emit('change', {
        colour: colour.value,
        dashed: dashed.value,
        width: width.value
    })
}
</script>

<style>
/* Otherwise the tick mark is not obvious */
.p-checkbox-checked .p-checkbox-icon {
    color: red !important;
}
</style>

<style scoped>
.flexPrompt {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
}

.spacer {
    height: 10px;
}
/* Based on https://rebeccamdeprey.com/blog/styling-the-html-color-input */

input[type="color" i] {
  inline-size: 24px;
  block-size: 24px;
}

/* Affects area between outer circle and color swatch. Firefox doesn't have an equivalent. */
input[type="color" i]::-webkit-color-swatch-wrapper {
  padding: 1px;
}

/* Affects the inner circle, i.e. the current color selection */
input[type="color" i]::-webkit-color-swatch {
  border-radius: 40%;
}

input[type="color" i]::-moz-color-swatch {
  border-radius: 40%;
}
</style>
