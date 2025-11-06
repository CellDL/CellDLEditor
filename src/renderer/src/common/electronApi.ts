import type { ISettings } from './common.js'

interface IElectronApi {
    // Note: this must be in sync with src/preload/index.ts.

    operatingSystem: () => string

    // Renderer process asking the main process to do something for it.

    checkForUpdates: (atStartup: boolean) => void
    downloadAndInstallUpdate: () => void
    installUpdateAndRestart: () => void

    loadSettings: () => Promise<ISettings>
    resetAll: () => void
    saveSettings: (settings: ISettings) => void

    // Renderer process listening to the main process.

    onAbout: (callback: () => void) => void
    onAction: (callback: (action: string) => void) => void
    onCheckForUpdates: (callback: () => void) => void
    onEnableDisableUi: (callback: (enable: boolean) => void) => void;
    onResetAll: (callback: () => void) => void;
    onSettings: (callback: () => void) => void
    onUpdateAvailable: (callback: (version: string) => void) => void
    onUpdateCheckError: (callback: (issue: string) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    onUpdateDownloadError: (callback: (issue: string) => void) => void
    onUpdateDownloadProgress: (callback: (percent: number) => void) => void
    onUpdateNotAvailable: (callback: () => void) => void

    onFileAction: (callback: (event: Event, action: string, path: string, ...args: any[]) => void) => Promise<void>,
    onMenuAction: (callback: (event: Event, action: string, ...args: any[]) => void) => Promise<void>,

    sendEditorAction: (action: string, ...args: any[]) => Promise<void>,
    sendFileAction: (action: string, path: string, ...args: any[]) => Promise<void>
}

interface IWindow {
    electronApi: IElectronApi
}

export const electronApi: IElectronApi | undefined = (window as unknown as IWindow).electronApi
