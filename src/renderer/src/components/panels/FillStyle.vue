<template lang="pug">
    .card
        .flexPrompt
            label(for="gradient") Gradient fill:
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
            :class="{ hidden: !gradientStyle }"
            @click="swapColours"
        )
        .flexPrompt#stopColour(:class="{ hidden: !gradientStyle }")
            label(for="stop") Stop colour:
            input.colour#stopInput(
                type="color"
                :value="stopColour"
                @input="colourChange"
            )
        .spacer
        .flexPrompt#stopColour(:class="{ hidden: !gradientStyle }")
            label Direction:
            #directions
                .flex.items-right.gap-2
                    label(for="horizontal") H
                    RadioButton(
                        v-model="gradientDirn"
                        inputId="horizontal"
                        name="dirn"
                        value="H"
                        @change="emitChange"
                    )
                .flex.items-right.gap-2
                    label(for="vertical") V
                    RadioButton(
                        v-model="gradientDirn"
                        inputId="vertical"
                        name="dirn"
                        value="V"
                        @change="emitChange"
                    )
</template>

<script lang="ts">
export interface IFillStyle {
    gradientFill: boolean
    colours: string[]
    direction?: string
}
</script>

<script setup lang="ts">
import * as vue from 'vue'
import { TinyColor } from '@ctrl/tinycolor'

const props = defineProps<{
    fillStyle: IFillStyle
}>()

const startPrompt = vue.ref(props.fillStyle.gradient ? 'Start colour' : 'Fill colour')

const gradientFill = vue.computed<boolean>({
    get() {
        return props.fillStyle.gradient
    },
    set(gradient: boolean) {
        if (gradient) {
            startPrompt.value = 'Start colour'
            gradientStyle.value = true
        } else {
            startPrompt.value = 'Fill colour'
            gradientStyle.value = false
        }
    emitChange()
    }
})

const gradientStyle = vue.ref<boolean>(props.fillStyle.gradient)

vue.watch(
    () => props.fillStyle,
    () => {
        startPrompt.value = props.fillStyle.gradient ? 'Start colour' : 'Fill colour'
        gradientStyle.value = props.fillStyle.gradient
        colours.value = {
            start: props.fillStyle.colours[0],
            stop: props.fillStyle.colours[1] ?? props.fillStyle.colours[0]
        }
        gradientDirn.value = props.fillStyle.direction ?? 'H'
    }
)

const colours = vue.ref({
    start: props.fillStyle.colours[0],
    stop: props.fillStyle.colours[1] ?? props.fillStyle.colours[0]
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
    if (gradientStyle.value) {
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
