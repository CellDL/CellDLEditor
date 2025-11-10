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
  <div v-else>
    <FloatLabel variant="on">
      <InputText
        v-model="scalarValueString"
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
</template>

<script setup lang="ts">
import * as vue from 'vue';

import type * as locApi from '../../libopencor/locUIJsonApi';

const value = defineModel<number>({ required: true });
const emits = defineEmits(['change']);
const props = defineProps<{
  maximumValue?: number;
  minimumValue?: number;
  name: string;
  possibleValues?: locApi.IUiJsonDiscreteInputPossibleValue[];
  stepValue?: number;
}>();

let oldValue = value.value;
const discreteValue = vue.ref<locApi.IUiJsonDiscreteInputPossibleValue | undefined>(
  props.possibleValues ? props.possibleValues[value.value] : undefined
);
const scalarValue = vue.ref<number>(value.value);
const scalarValueString = vue.ref<string>(String(value.value));

// Some methods to handle a scalar value using an input text and a slider.

function emitChange(newValue: number) {
  void vue.nextTick().then(() => {
    value.value = newValue;

    if (props.possibleValues === undefined) {
      scalarValue.value = newValue;
      scalarValueString.value = String(newValue); // This will properly format the input text.
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
  if (newValueString === '') {
    newValueString = String(props.minimumValue);
  }

  if (props.minimumValue !== undefined && Number(newValueString) < props.minimumValue) {
    newValueString = String(props.minimumValue);
  }

  if (props.maximumValue !== undefined && Number(newValueString) > props.maximumValue) {
    newValueString = String(props.maximumValue);
  }

  const newValue = Number(newValueString);

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
