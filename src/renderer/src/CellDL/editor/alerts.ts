/******************************************************************************

CellDL Editor

Copyright (c) 2022 - 2025 David Brooks

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

******************************************************************************/

import { CellDLEditor } from '@editor/editor'

//==============================================================================

export namespace alert {
    export function clear() {
        if (CellDLEditor.instance) {
            CellDLEditor.instance.showMessage('')
        }
    }

    export function error(msg: string) {
        console.error(msg)
        if (CellDLEditor.instance) {
            CellDLEditor.instance.showMessage(msg, 'error')
        }
    }

    export function info(msg: string) {
        if (CellDLEditor.instance) {
            CellDLEditor.instance.showMessage(msg, 'info')
        }
    }

    export function tooltip(msg: string) {
        if (CellDLEditor.instance) {
            if (msg !== '') {
                CellDLEditor.instance.showTooltip(msg, 'error')
            } else {
                CellDLEditor.instance.hideTooltip()
            }
        }
    }

    export function warn(msg: string) {
        console.warn(msg)
        if (CellDLEditor.instance) {
            CellDLEditor.instance.showMessage(msg, 'warn')
        }
    }

    export function elementError(msg: string, svgElement?: SVGGraphicsElement) {
        if (svgElement) {
            svgElement.classList.add('error')
        }
        error(msg)
    }
}

//==============================================================================
//==============================================================================
