// Based on `src/renderer/src/libopencor/locUiJsonApi.ts` from OpenCOR's web app.

export interface IUiJson {
  input: IUiJsonInput[];
  output: IUiJsonOutput;
  parameters: IUiJsonParameter[];
}

export type IUiJsonInput = IUiJsonDiscreteInput | IUiJsonScalarInput | IUiJsonTextInput;

export interface IUiJsonDiscreteInput {
  defaultValue: IUiJsonDiscreteInputPossibleValue;
  id?: string;
  name: string;
  possibleValues: IUiJsonDiscreteInputPossibleValue[];
  value: IUiJsonDiscreteInputPossibleValue;
  visible?: string;
}

export interface IUiJsonDiscreteInputPossibleValue {
  name: string;
  value: number|string;
  emphasise?: boolean
}

interface IUiJsonScalarInput {
  defaultValue: number;
  id?: string;
  maximumValue: number;
  minimumValue: number;
  name: string;
  stepValue?: number;
  visible?: string;
}

export interface IUiJsonOutput {
  data: IUiJsonOutputData[];
  plots: IUiJsonOutputPlot[];
}

export interface IUiJsonOutputData {
  id: string;
  name: string;
}

export interface IUiJsonOutputPlot {
  xAxisTitle: string;
  xValue: string;
  yAxisTitle: string;
  yValue: string;
}

export interface IUiJsonParameter {
  name: string;
  value: string;
}

export interface IUiJsonTextInput {
  defaultValue: string;
  name: string;
  value?: string;
}
