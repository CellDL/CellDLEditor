import { type PyodideAPI } from '@pyodide/pyodide'

export declare global {
   declare module globalThis {
      var pyodide: PyodideAPI
      var pyodideInitialised: boolean
   }
}
