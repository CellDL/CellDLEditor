import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import topLevelAwait from "vite-plugin-top-level-await";
import tailwindcssPlugin from '@tailwindcss/vite'
import vuePlugin from '@vitejs/plugin-vue'

import path from 'node:path'
import url from 'node:url'
import vitePlugin from 'unplugin-vue-components/vite'
import * as vite from 'vite'

const _dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default vite.defineConfig({
    assetsInclude: [
        'oxigraph/*',
        '**/*.ttl'
    ],
    base: 'https://celldl.github.io/CellDLEditor/',
    build: {
        chunkSizeWarningLimit: 2048,
        rollupOptions: {
            output: {
                entryFileNames: `assets/[name].js`,
                chunkFileNames: `assets/[name].js`,
                assetFileNames: `assets/[name].[ext]`
            }
        },
        target: 'esnext'
    },
    optimizeDeps: {
        esbuildOptions: {
            target: 'esnext'
        },
        exclude: [
            'oxigraph'
        ]
    },
    plugins: [
        // Note: this must be in sync with electron.vite.config.ts.

        tailwindcssPlugin(),
        topLevelAwait({
          // The export name of top-level await promise for each chunk module
          promiseExportName: "__tla",
          // The function to generate import names of top-level await promise in each chunk module
          promiseImportName: (i: string) => `__tla_${i}`
        }),
        vuePlugin(),
        vitePlugin({
            resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
        })
    ],
    resolve: {
        alias: {
            'node-fetch': 'isomorphic-fetch',
            '@editor': path.resolve(_dirname, 'src/CellDL'),
            '@pyodide': path.resolve(_dirname, 'public/pyodide'),
            '@renderer': path.resolve(_dirname, 'src')
        }
    },
    server: {
        fs: {
            allow: [path.join(_dirname, '../..')]
        }
    }
})
