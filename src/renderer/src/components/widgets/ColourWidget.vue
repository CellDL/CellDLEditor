<template lang="pug">
    .card
        .flexPrompt
            label(for="gradient") Gradient:
            Checkbox#gradientCheckbox(
                v-model="gradientFill"
                binary
            )
        Divider
        .flexPrompt
            label(for="start") {{ startPrompt }}:
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
            :class="{ hidden: solidFill }"
            @click="swapColours"
        )
        .flexPrompt#stopColour(:class="{ hidden: solidFill }")
            label(for="stop") Stop colour:
            input.colour#stopInput(
                type="color"
                :value="stopColour"
                @input="colourChange"
            )
        .spacer
        .flexPrompt#stopColour(:class="{ hidden: solidFill }")
            label Direction:
            #directions
                .flex.items-right.gap-2
                    label(for="horizontal") H
                    RadioButton(
                        v-model="direction"
                        inputId="horizontal"
                        name="dirn"
                        value="H"
                    )
                .flex.items-right.gap-2
                    label(for="vertical") V
                    RadioButton(
                        v-model="direction"
                        inputId="vertical"
                        name="dirn"
                        value="V"
                    )
</template>

<script setup lang="ts">
import * as vue from 'vue'
import { TinyColor } from '@ctrl/tinycolor'

const startPrompt = vue.ref('Fill colour')
const solidFill = vue.ref(true)

const gradientFill = vue.computed<boolean>({
    get() {
        return false
    },
    set(gradient: boolean) {
        if (gradient) {
            solidFill.value = false
            startPrompt.value = 'Start colour'
        } else {
            solidFill.value = true
            startPrompt.value = 'Fill colour'
        }
    }
})

const colours = vue.ref<{
    start: string
    stop?: string
}>({
    start: 'red'
})

const startColour = vue.computed<string>(() => {
    return new TinyColor(colours.value.start).toHexString()
})

const stopColour = vue.computed<string>(() => {
    if (!colours.value.stop) {
        colours.value.stop = colours.value.start
    }
    return new TinyColor(colours.value.stop).toHexString()
})

function colourChange(e: Event) {
    const target = e.target as HTMLInputElement
    if (target.id === 'startInput') {
        colours.value.start = target.value
    } else if (target.id === 'stopInput') {
        colours.value.stop = target.value
    }
}

function swapColours(e: Event) {
    const stopColour = colours.value.stop
    colours.value.stop = colours.value.start
    colours.value.start = stopColour
}

const direction = vue.ref('H');

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
