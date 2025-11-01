import electron from 'electron'
import path from 'node:path'

export class ApplicationWindow extends electron.BrowserWindow {
    constructor(options: electron.BrowserWindowConstructorOptions) {
        // Add some common options and call our parent constructor.
        // Note: we use backgroundColor to minimise the flickering that may occur when first showing a window. This means
        //       that the colours used here should be the same as the ones used by --p-content-background in PrimeVue, i.e.
        //       what we are using as a background for our app (see src/renderer/src/assets/app.css).

        options.backgroundColor = electron.nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff'
        options.show = false
        options.useContentSize = true
        options.webPreferences = {
            preload: path.join(import.meta.dirname, '../preload/index.mjs'),
            sandbox: false
        }

        super(options)

        // Show our window when we are ready to show it.

        this.once('ready-to-show', () => {
            this.show()
        })
    }
}
