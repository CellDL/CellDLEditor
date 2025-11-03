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

import { html } from '@xel/utils/template'
import type { CellDLDiagram } from '@editor/diagram'
import type { CellDLObject } from '@editor/celldlObjects'

//==============================================================================


import { BaseElement } from '../uiElements/index.ts'
import type { PanelInterface } from './index.ts'

//==============================================================================

export default class ObjectsPanel extends BaseElement implements PanelInterface {
    static _shadowTemplate = html`
        <div>
            <h2>
                <x-message autocapitalize="">Objects</x-message>
            </h2>
        </div>
    `

    setDiagram(_celldlDiagram: CellDLDiagram) {
        //=======================================
    }

    setCurrentObject(_celldlObject: CellDLObject | null) {
        //================================================
    }
}

//==============================================================================

customElements.define('cd-objects-panel', ObjectsPanel)

//==============================================================================
