import { type PyodideAPI } from '@pyodide/pyodide'

export declare global {
   declare namespace globalThis {
      var pyodide: PyodideAPI
      var pyodideInitialised: boolean
   }
}
