<template lang="pug">
    .bottom-margin(v-if="possibleValues !== undefined")
        FloatLabel(variant="on")
            Select(
                v-model="discreteValue"
                :options="possibleValues"
                optionLabel="name"
                @change="selectChange"
                class="w-full"
                size="small"
            )
                template(#value="slotProps")
                    span(
                        v-if="slotProps.value"
                        :class="{ emphasise: slotProps.value.emphasise }"
                    ) {{ slotProps.value.name }}
                    span(v-else) {{ slotProps.placeholder }}
                template(#option="slotProps")
                    .flex.items-center
                        span(:class="{ emphasise: slotProps.option.emphasise }") {{ slotProps.option.name }}
            label {{ name }}
    .bottom-margin(v-else-if="scalarType")
        FloatLabel(variant="on")
            InputText(
                v-model="scalarValue"
                v-keyfilter.num
                v-on:focusout="inputTextFocusOut"
                v-on:keypress="inputTextKeyPress"
                class="w-full"
                size="small"
            )
            label {{ nameUnits }}
    .bottom-margin(v-else)
        FloatLabel(variant="on")
            InputText(
                v-model="value"
                @value-change="inputTextChange"
                class="w-full"
                size="small"
            )
            label {{ name }}
</template>

<script setup lang="ts">
import * as vue from 'vue'

import KeyFilter from 'primevue/keyfilter';
//  v-keyfilter="{ pattern: /^[+-]?((\d+(\.\d*)?)|(\.\d+))([eE][+-]?\d+)?$/, validateOnly: true }"

import type * as locApi from '../../libopencor/locUIJsonApi'

const value = defineModel<number|string|locApi.IUiJsonDiscreteInputPossibleValue>({ required: true })

const emits = defineEmits(['change'])

const props = defineProps<{
    maximumValue?: number
    minimumValue?: number
    itemId: string
    name: string
    units?: string
    numeric?: boolean
    possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[]
    stepValue?: number
}>()

const nameUnits = vue.computed(() => props.units ? `${props.name} (${props.units})` : props.name)

const scalarType = !!props.numeric

let oldValue = (props.possibleValues === undefined) ? value.value : value.value.value

const discreteValue = vue.computed<locApi.IUiJsonDiscreteInputPossibleValue>({
    get() {
        return value.value
    },
    set(_: number | string) {
    }
})

const scalarValue = vue.ref<number>(value.value);
const scalarValueString = vue.ref<string>(String(value.value));

// Some methods to handle a scalar value using an input text and a slider.

function emitChange(newValue: number | string) {
    void vue.nextTick().then(() => {
        if (scalarType && props.possibleValues === undefined) {
            value.value = newValue
            scalarValue.value = <number>newValue
            scalarValueString.value = String(newValue) // This will properly format the input text.
        }

        emits('change', props.itemId, oldValue, newValue)
        oldValue = newValue
    })
}

interface ISelectChangeEvent {
    value: {
        name: string
        value: number
    }
}

function selectChange(event: ISelectChangeEvent) {
    if (event.value.value !== oldValue) {
        emitChange(event.value.value)
    }
}

function inputTextChange(newValueString: string) {
    if (scalarType && newValueString === '') {
        newValueString = String(props.minimumValue)
    }

    if (props.minimumValue !== undefined && Number(newValueString) < props.minimumValue) {
        newValueString = String(props.minimumValue)
    }

    if (props.maximumValue !== undefined && Number(newValueString) > props.maximumValue) {
        newValueString = String(props.maximumValue)
    }

    const newValue = scalarType ? Number(newValueString) : newValueString

    if (newValue !== oldValue) {
        emitChange(newValue)
    }
}

function inputTextFocusOut(event: Event) {
    inputTextChange((event.target as HTMLInputElement).value)
}

function inputTextKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
        inputTextChange((event.target as HTMLInputElement).value)
    }
}
</script>

<style scoped>
    .bottom-margin {
        margin-bottom: 30px;
    }
    .emphasise {
        font-style: italic;
    }
</style>
