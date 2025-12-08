<template lang="pug">
    .card
        .flexPrompt
            label(for="gradientCheckbox") Gradient fill:
            Checkbox#gradientCheckbox(
                v-model="fillStyle.gradientFill"
                @change="styleChange"
                binary
            )
        Divider
        .flexPrompt
            label(for="startInput") {{ startPrompt }}:
            input.colour#startInput(
                type="color"
                :value="startColour"
                @input="colourChange"
            )
        Button#swapButton(
            icon="pi pi-sort-alt"
            variant="text"
            aria-label="Swap colours"
            size="small"
            :class="{ hidden: !fillStyle.gradientFill }"
            @click="swapColours"
        )
        .flexPrompt#stopColour(:class="{ hidden: !fillStyle.gradientFill }")
            label(for="stopInput") Stop colour:
            input.colour#stopInput(
                type="color"
                :value="stopColour"
                @input="colourChange"
            )
        .spacer
        .flexPrompt#stopColour(:class="{ hidden: !fillStyle.gradientFill }")
            label Direction:
            #directions
                .flex.items-right.gap-2
                    label(for="horizontal") H
                    RadioButton#horizontal(
                        v-model="gradientDirn"
                        inputId="horizontal"
                        name="dirn"
                        value="H"
                        @change="emitChange"
                    )
                .flex.items-right.gap-2
                    label(for="vertical") V
                    RadioButton#vertical(
                        v-model="gradientDirn"
                        inputId="vertical"
                        name="dirn"
                        value="V"
                        @change="emitChange"
                    )
</template>

<script setup lang="ts">
import * as vue from 'vue'
import { TinyColor } from '@ctrl/tinycolor'

import { type INodeStyle } from '@editor/plugins/bondgraph/index'

const props = defineProps<{
    fillStyle: INodeStyle
}>()

const startPrompt = vue.ref(props.fillStyle.gradientFill ? 'Start colour' : 'Fill colour')

function styleChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.checked) {
        startPrompt.value = 'Start colour'
        props.fillStyle.gradientFill = true
    } else {
        startPrompt.value = 'Fill colour'
        props.fillStyle.gradientFill = false
    }
    emitChange()
}

vue.watch(
    () => props.fillStyle,
    () => {
        startPrompt.value = props.fillStyle.gradientFill ? 'Start colour' : 'Fill colour'
        gradientDirn.value = props.fillStyle.direction ?? 'H'
    }
)

const colours = vue.computed<{
    start: string
    stop: string
}>(() => {
    return {
        start: props.fillStyle.colours[0],
        stop: props.fillStyle.colours[1] ?? props.fillStyle.colours[0]
    }
})

const startColour = vue.computed<string>(() => {
    return new TinyColor(colours.value.start).toHexString()
})

const stopColour = vue.computed<string>(() => {
    const stopColour = colours.value.stop || colours.value.start
    return new TinyColor(stopColour).toHexString()
})

const gradientDirn = vue.ref<string>(props.fillStyle.direction ?? 'H')

function colourChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.id === 'startInput') {
        colours.value.start = target.value
    } else if (target.id === 'stopInput') {
        colours.value.stop = target.value
    }
    emitChange()
}

function swapColours(e: Event) {
    const stopColour = colours.value.stop
    colours.value.stop = colours.value.start
    colours.value.start = stopColour
    emitChange()
}

const emit = defineEmits(['change'])

function emitChange() {
    if (props.fillStyle.gradientFill) {
        emit('change', {
            gradientFill: true,
            colours: [colours.value.start, colours.value.stop],
            direction: gradientDirn.value
        })
    } else {
        emit('change', {
            gradientFill: false,
            colours: [colours.value.start]
        })
    }
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

#gradientCheckbox {
    margin-right: 3px;
}
#swapButton {
    padding: 0;
}
#directions {
    display: flex;
    flex-direction: column;
}

.hidden {
    display: none;
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
