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
            InputText(
                v-model="width"
                v-keyfilter.num
                v-on:focusout="emitChange"
                v-on:keypress="emitChange"
                class="w-full"
                size="small"
            )
            label {{ nameUnits }}
        .flexPrompt
            label(for="gradient") Width:
            Checkbox#gradientCheckbox(
                v-model="dashed"
                binary
            )
        .flexPrompt
            label(for="gradient") Dashed:
            Checkbox#gradientCheckbox(
                v-model="dashed"
                binary
            )
</template>

<script setup lang="ts">
import * as vue from 'vue'
import { TinyColor } from '@ctrl/tinycolor'

import { type IPathStyle } from '@editor/plugins/bondgraph/index'

const props = defineProps<{
    pathStyle: IPathStyle
}>()

const colour = vue.ref(props.pathStyle.colour)
const dashed = vue.ref(props.dashed.colour)
const width = vue.ref(props.width.colour)

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
