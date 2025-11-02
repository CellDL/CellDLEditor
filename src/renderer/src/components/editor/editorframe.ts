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

import { type PointLike, PointMath } from '../../CellDL/geometry/index.ts'
import type { ObjectTemplate } from '../../CellDL/components/index.ts'

//==============================================================================

export const EDITOR_FRAME_ID = 'celldl-editor-selection-frame'

//==============================================================================

export class EditorFrame {
    #frameGroupElement: SVGGElement

    constructor(svgDiagram: SVGSVGElement) {
        let editorFrameGroup = svgDiagram.getElementById(EDITOR_FRAME_ID) as SVGGraphicsElement
        if (editorFrameGroup === null) {
            // Create a new group at the end of our SVG
            svgDiagram.insertAdjacentHTML('beforeend', `<g id="${EDITOR_FRAME_ID}"/>`)
            editorFrameGroup = svgDiagram.getElementById(EDITOR_FRAME_ID) as SVGGraphicsElement
        }
        this.#frameGroupElement = editorFrameGroup

        // Remove any children that might be present
        this.clear()
    }

    get svgGroup() {
        return this.#frameGroupElement
    }

    addElementAsString(element: string): SVGGraphicsElement | null {
        if (this.#frameGroupElement) {
            this.#frameGroupElement.insertAdjacentHTML('beforeend', element)
            return this.#frameGroupElement.lastChild as SVGGraphicsElement
        }
        return null
    }

    addSvgElement(template: ObjectTemplate, topLeft: PointLike): SVGGElement {
        const componentGroup = `<g style="visibility: hidden">${template.svg}</g>`
        this.#frameGroupElement.insertAdjacentHTML('beforeend', componentGroup)
        const svgElement = this.#frameGroupElement.lastChild as SVGGElement
        const bbox = svgElement.getBBox()
        const translation = PointMath.subtract(topLeft, bbox)
        svgElement.setAttribute('transform', `translate(${translation.x}, ${translation.y})`)
        svgElement.removeAttribute('style')
        return svgElement
    }

    clear() {
        while (this.#frameGroupElement?.hasChildNodes()) {
            const child = this.#frameGroupElement.lastChild
            if (child !== null) {
                this.#frameGroupElement.removeChild(child)
            }
        }
    }

    contains(feature: SVGGraphicsElement) {
        return this.#frameGroupElement.contains(feature)
    }

    highlight(highlight = true) {
        if (highlight) {
            this.#frameGroupElement?.classList.add('highlight')
        } else {
            this.#frameGroupElement?.classList.remove('highlight')
        }
    }

    removeElement(element: SVGGraphicsElement | null) {
        if (element && this.#frameGroupElement.contains(element)) {
            this.#frameGroupElement.removeChild(element)
        }
    }
}

//==============================================================================
