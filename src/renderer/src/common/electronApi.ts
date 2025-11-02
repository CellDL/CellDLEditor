import type { ISettings } from './common.js'

export interface ISplashScreenInfo {
    copyright: string
    version: string
}

interface IElectronApi {
    // Note: this must be in sync with src/preload/index.ts.

    operatingSystem: () => string

    onInitSplashScreenWindow: (callback: (info: ISplashScreenInfo) => void) => void

    // Renderer process asking the main process to do something for it.

    checkForUpdates: (atStartup: boolean) => void
    downloadAndInstallUpdate: () => void
    installUpdateAndRestart: () => void

    loadSettings: () => Promise<ISettings>
    resetAll: () => void
    saveSettings: (settings: ISettings) => void

    // Renderer process listening to the main process.

    onAbout: (callback: () => void) => void
    onSettings: (callback: () => void) => void

    onCheckForUpdates: (callback: () => void) => void
    onUpdateAvailable: (callback: (version: string) => void) => void
    onUpdateCheckError: (callback: (issue: string) => void) => void
    onUpdateDownloaded: (callback: () => void) => void
    onUpdateDownloadError: (callback: (issue: string) => void) => void
    onUpdateDownloadProgress: (callback: (percent: number) => void) => void
    onUpdateNotAvailable: (callback: () => void) => void

    onFileAction: (callback: () => void) => Promise<void>,
    onMenuAction: (callback: () => void) => Promise<void>,
    sendEditorAction: (action: string, ...args: any) => Promise<void>,
    sendFileAction: (action: string, path: string, data: string|undefined) => Promise<void>
}

interface IWindow {
    electronApi: IElectronApi
}

export const electronApi: IElectronApi | undefined = (window as unknown as IWindow).electronApi
