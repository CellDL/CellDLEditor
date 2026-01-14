import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import tailwindcssPlugin from '@tailwindcss/vite'
import topLevelAwait from "vite-plugin-top-level-await";
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
    build: {
        lib: {
            entry: './index.ts',
            fileName: (format: string) => `CellDLEditor.${format}.js`,
            formats: ['es'],
            name: 'CellDLEditor'
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                exports: 'named',
                globals: {
                    vue: 'Vue'
                },
                assetFileNames: (assetInfo: { names: string }) => {
                    if (assetInfo.names.includes('celldl-editor.css')) {
                        return 'CellDLEditor.css'
                    }

                    return assetInfo.names[0] ?? 'default-name'
                }
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
    resolve: {
        alias: {
            'node-fetch': 'isomorphic-fetch',
            '@editor': path.resolve(_dirname, 'src/CellDL'),
            '@pyodide': path.resolve(_dirname, 'public/pyodide'),
            '@renderer': path.resolve(_dirname, 'src')
        }
    },
    plugins: [
        // Note: this must be in sync with vite.config.ts.

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
    ]
})
