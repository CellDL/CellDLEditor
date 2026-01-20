import fs from 'node:fs'

for (const path of [
    'dist',
    'node_modules',
    'out',
    'src/main/build',
    'src/renderer/components.d.ts',
    'src/renderer/dist',
    'src/renderer/public/bg-rdf',
    'src/renderer/public/oxigraph',
    'src/renderer/public/pyodide',
    'src/renderer/public/python',
    'src/renderer/node_modules',
    'src/renderer/src/assets/bg-rdf'
]) {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true })
    }
}
