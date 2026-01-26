import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import tailwindcssPlugin from '@tailwindcss/vite'
import vuePlugin from '@vitejs/plugin-vue'

import * as electronVite from 'electron-vite'
import path from 'node:path'
import url from 'node:url'
import vitePlugin from 'unplugin-vue-components/vite'

const _dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default electronVite.defineConfig({
    main: {
        build: {
            rollupOptions: {
                output: {
                    format: 'cjs'
                }
            }
        },
        plugins: [electronVite.bytecodePlugin(), electronVite.externalizeDepsPlugin()]
    },
    preload: {
        plugins: [electronVite.externalizeDepsPlugin()]
    },
    renderer: {
        build: {
            target: 'esnext'
        },
        optimizeDeps: {
            esbuildOptions: {
                target: 'esnext'
            }
        },
        plugins: [
            // Note: this must be in sync with src/renderer/vite.config.ts.

            tailwindcssPlugin(),
            vuePlugin(),
            vitePlugin({
                resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
            })
        ],
        resolve: {
            alias: {
                'node-fetch': 'isomorphic-fetch',
                '@editor': path.resolve(_dirname, 'src/renderer/src/CellDL'),
                '@pyodide': path.resolve(_dirname, 'src/renderer/public/pyodide'),
                '@oxigraph': path.resolve(_dirname, 'src/renderer/src/assets/oxigraph'),
                '@renderer': path.resolve(_dirname, 'src/renderer/src')
            }
        },
        server: {
            fs: {
                allow: [path.join(import.meta.dirname, '..')]
            }
        }
    }
})
