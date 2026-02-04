import fs from 'node:fs'

for (const path of [
    'dist',
    'node_modules',
    'out',
    'src/main/build',
    'src/renderer/components.d.ts',
    'src/renderer/dist',
    'src/renderer/public/bg-rdf',
    'src/renderer/node_modules',
    'src/renderer/src/assets/bg-rdf',
    'src/renderer/src/assets/oxigraph',
    'src/renderer/src/assets/pyodide',
    'src/renderer/src/assets/wheels'
]) {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true })
    }
}
