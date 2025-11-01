import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Major version.

const majorVersion = 0

// Minor version.

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1
const day = now.getDate()
const minorVersion = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`

// Patch version.

let patchVersion = 0

try {
    const gitDescribe = execSync('git describe --tags --long', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    const match = gitDescribe.match(/^v?(\d+)\.(\d+)\.(\d+)-(\d+)-g[0-9a-f]+$/)
    const [, , minor, patch] = match

    patchVersion = parseInt(patch, 10)

    if (minor === minorVersion) {
        ++patchVersion
    } else {
        patchVersion = 0
    }
} catch {
    // Intentionally ignored.
}

// (Full) version.

const version = `${majorVersion}.${minorVersion}.${patchVersion}`

// Update our package.json files.

function updatePackageJsonFile(filePath) {
    const contents = JSON.parse(fs.readFileSync(filePath))

    contents.version = version

    fs.writeFileSync(filePath, `${JSON.stringify(contents, null, 2)}\n`)
}

// Output the current directory.

const scriptDirName = path.dirname(fileURLToPath(import.meta.url))

updatePackageJsonFile(`${scriptDirName}/../../../package.json`)
updatePackageJsonFile(`${scriptDirName}/../package.json`)
