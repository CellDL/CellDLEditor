import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import tailwindcssPlugin from '@tailwindcss/vite'
import vuePlugin from '@vitejs/plugin-vue'

import path from 'node:path'
import url from 'node:url'
import vitePlugin from 'unplugin-vue-components/vite'
import * as vite from 'vite'

const _dirname = path.dirname(url.fileURLToPath(import.meta.url))

export default vite.defineConfig({
    assetsInclude: [
        'pyodide/*',
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
            },
            external: [
                '/CellDLEditor/bg-rdf/ontology.ttl?url&raw',
                '/CellDLEditor/bg-rdf/templates/chemical.ttl?url&raw',
                '/CellDLEditor/bg-rdf/templates/electrical.ttl?url&raw',
                '/CellDLEditor/bg-rdf/templates/hydraulic.ttl?url&raw',
                '/CellDLEditor/bg-rdf/templates/mechanical.ttl?url&raw'
            ]
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
