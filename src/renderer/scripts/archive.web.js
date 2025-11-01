import fs from 'node:fs'
import * as tar from 'tar'

if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist')
}

const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version

tar.c(
    {
        gzip: true,
        file: `dist/CellDLEditor-${version}-WebApp.tar.gz`,
        cwd: 'src/renderer/dist'
    },
    ['.']
)
