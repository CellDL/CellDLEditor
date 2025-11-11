// Based on `src/renderer/src/libopencor/locUiJsonApi.ts` from OpenCOR's web app.

export interface IUiJson {
  input: IUiJsonInput[];
  output: IUiJsonOutput;
  parameters: IUiJsonParameter[];
}

export type IUiJsonInput = IUiJsonDiscreteInput | IUiJsonScalarInput | IUiJsonTextInput;

interface IUiJsonDiscreteInput {
  defaultValue: number;
  id?: string;
  name: string;
  possibleValues: IUiJsonDiscreteInputPossibleValue[];
  visible?: string;
}

export interface IUiJsonDiscreteInputPossibleValue {
  name: string;
  value: number;
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
