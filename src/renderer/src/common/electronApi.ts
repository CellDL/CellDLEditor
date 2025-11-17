interface IElectronApi {
    // Note: this must be in sync with src/preload/index.ts.
    onFileAction: (callback: (event: Event, action: string, path: string, ...args: any[]) => void) => Promise<void>
    onMenuAction: (callback: (event: Event, action: string, ...args: any[]) => void) => Promise<void>

    sendEditorAction: (action: string, ...args: any[]) => Promise<void>
    sendFileAction: (action: string, path: string, ...args: any[]) => Promise<void>
}

interface IWindow {
    electronApi: IElectronApi
}

export const electronApi: IElectronApi | undefined = (window as unknown as IWindow).electronApi
