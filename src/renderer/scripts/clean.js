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
    'src/renderer/node_modules'
]) {
    if (fs.existsSync(path)) {
        fs.rmSync(path, { recursive: true, force: true })
    }
}
