import * as primeVueAutoImportResolver from '@primevue/auto-import-resolver'
import tailwindcssPlugin from '@tailwindcss/vite'
import vuePlugin from '@vitejs/plugin-vue'

import path from 'node:path'
import url from 'node:url'
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { viteStaticCopy } from "vite-plugin-static-copy";
import vitePlugin from 'unplugin-vue-components/vite'
import * as vite from 'vite'

const _dirname = path.dirname(url.fileURLToPath(import.meta.url))

const PYODIDE_EXCLUDE = [
  "!**/*.{md,html}",
  "!**/*.d.ts",
  "!**/*.whl",
  "!**/node_modules",
];

export function viteStaticCopyPyodide() {
  const pyodideDir = dirname(fileURLToPath(import.meta.resolve("pyodide")));
  return viteStaticCopy({
    targets: [
      {
        src: [join(pyodideDir, "*")].concat(PYODIDE_EXCLUDE),
        dest: "assets",
      },
    ],
  });
}

export default vite.defineConfig({
    assetsInclude: ['**/*.ttl'],
    base: './',
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
        exclude: ["pyodide"]
    },
    plugins: [
        // Note: this must be in sync with electron.vite.config.ts.

        tailwindcssPlugin(),
        vuePlugin(),
        vitePlugin({
            resolvers: [primeVueAutoImportResolver.PrimeVueResolver()]
        }),
//        viteStaticCopyPyodide()
    ],
    resolve: {
        alias: {
            'node-fetch': 'isomorphic-fetch',
            '@editor': path.resolve(_dirname, 'src/CellDL'),
            '@oxigraph': path.resolve(_dirname, 'public/oxigraph'),
            '@pyodide': path.resolve(_dirname, 'public/pyodide'),
            '@renderer': path.resolve(_dirname, 'src')
        }
    },
    server: {
        fs: {
            allow: [path.join(import.meta.dirname, '../..')]
        }
    }
})
