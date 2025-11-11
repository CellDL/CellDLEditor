<template>
  <div v-if="possibleValues !== undefined">
    <FloatLabel variant="on">
      <Select
        v-model="discreteValue"
        :options="possibleValues"
        optionLabel="name"
        @change="selectChange"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
  </div>
  <div v-if="scalarType">
    <FloatLabel variant="on">
      <InputText
        v-model="valueString"
        v-keyfilter="{ pattern: /^[+-]?(\d*(\.\d*)?|\.d*)([eE][+-]?\d*)?$/, validateOnly: true }"
        v-on:focusout="inputTextFocusOut"
        v-on:keypress="inputTextKeyPress"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
    <Slider
      v-model="scalarValue"
      :min="minimumValue"
      :max="maximumValue"
      :step="stepValue"
      @change="sliderChange"
      class="w-full mt-3"
      size="small"
    />
  </div>
  <div v-else>
    <FloatLabel variant="on" class="text-input">
      <InputText
        v-model="valueString"
        @value-change="inputTextChange"
        class="w-full"
        size="small"
      />
      <label>{{ name }}</label>
    </FloatLabel>
  </div>
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type * as locApi from '../../libopencor/locUIJsonApi';

const value = defineModel<number|string>({ required: true });
const emits = defineEmits(['change']);
const props = defineProps<{
  maximumValue?: number;
  minimumValue?: number;
  name: string;
  possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[];
  stepValue?: number;
}>();

const scalarType = value.value !== '' &&
                   value.value !== null &&
                   value.value !== undefined &&
                   vue.ref<boolean>(!isNaN(+value.value))

let oldValue = value.value;
const discreteValue = vue.ref<locApi.IUiJsonDiscreteInputPossibleValue | undefined>();
const scalarValue = vue.ref<number>()
if (scalarType) {
    discreteValue.value = props.possibleValues ? props.possibleValues[<number>value.value] : undefined;
    scalarValue.value = <number>value.value;
}

const valueString = vue.ref<string>(String(value.value));

// Some methods to handle a scalar value using an input text and a slider.

function emitChange(newValue: number|string) {
  void vue.nextTick().then(() => {
    value.value = newValue;

    if (scalarType && props.possibleValues === undefined) {
      scalarValue.value = <number>newValue;
      valueString.value = String(newValue); // This will properly format the input text.
    }

    oldValue = newValue;

    emits('change', props.name, newValue);
  });
}

interface ISelectChangeEvent {
  value: {
    name: string;
    value: number;
  };
}

function selectChange(event: ISelectChangeEvent) {
  if (event.value.value !== oldValue) {
    emitChange(event.value.value);
  }
}

function inputTextChange(newValueString: string) {
  if (scalarType.value && newValueString === '') {
    newValueString = String(props.minimumValue);
  }

  if (props.minimumValue !== undefined && Number(newValueString) < props.minimumValue) {
    newValueString = String(props.minimumValue);
  }

  if (props.maximumValue !== undefined && Number(newValueString) > props.maximumValue) {
    newValueString = String(props.maximumValue);
  }

  const newValue = scalarType.value ? Number(newValueString) : newValueString;

  if (newValue !== oldValue) {
    emitChange(newValue);
  }
}

function inputTextFocusOut(event: Event) {
  inputTextChange((event.target as HTMLInputElement).value);
}

function inputTextKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    inputTextChange((event.target as HTMLInputElement).value);
  }
}

function sliderChange(newValue: number | number[]) {
  const valueToEmit = Array.isArray(newValue) ? newValue[0] : newValue;

  if (valueToEmit !== oldValue) {
    emitChange(valueToEmit);
  }
}
</script>

<style scoped>
  .text-input {
    margin-bottom: 10px;
  }
</style>
