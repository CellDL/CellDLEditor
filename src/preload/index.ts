import { contextBridge, ipcRenderer } from 'electron'
import { exposeElectronAPI } from '@electron-toolkit/preload'

//==============================================================================

export interface IElectronAPI {
  onFileAction: (callback) => Promise<void>,
  onMenuAction: (callback) => Promise<void>,
  sendEditorAction: (action: string, ...args) => Promise<void>,
  sendFileAction: (action: string, path: string, data: string|undefined) => Promise<void>,
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
  }
}


exposeElectronAPI()







    sendEditorAction: (action: string, ...args: any) =>
        ipcRenderer.send('EDITOR_OP', action, ...args),
    sendFileAction: (action: string, path: string, data: string|undefined=undefined) =>
        ipcRenderer.send('FILE_OP', action, path, data),


    onFileAction: (callback: () => void) =>
        ipcRenderer.on('FILE_OP', callback),
    onMenuAction: (callback: () => void) =>
        ipcRenderer.on('EDITOR_OP', callback)
})

//==============================================================================
//==============================================================================
