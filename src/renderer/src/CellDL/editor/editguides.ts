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

import type { ViewState } from '@renderer/common/EditorTypes'
import { Point, type PointLike } from '@renderer/common/points'
import { getViewbox, SVG_URI } from '@renderer/common/svgUtils'
import type { CellDLDiagram } from '@editor/diagram/index'
import type { CellDLMoveableObject } from '@editor/celldlObjects/index'
import type { Extent } from '@editor/geometry/index'
import { range } from '@editor/utils'

//==============================================================================

export const EDITOR_GRID_CLASS = 'alignment-grid'

export const GRID_SNAP_RESOLUTION = 0.5 // Fraction of GRID_SPACING
export const GRID_SPACING = 10 // Pixels

// Within EPSILON pixels apart is considered to be aligned
const EPSILON = 0.1

//==============================================================================

//  Menu options and/or panel dialog
//
//  Grid on/off
//  Grid spacing, pattern (major/minor)
//
//  Component guides -- centre, edges
//
//  Dragable guides from frame
//
//  Snap centre, edges to guides/grid
//

//==============================================================================

export type GridAlignOptions = {
    fullSnap?: boolean
    noAlign?: boolean
    noAlignX?: boolean
    noAlignY?: boolean
    resolution?: number
    snapGrid?: boolean
}

type GridOptions = {
    gridSpacing: number // pixels
    resolution: number
    snapGrid: boolean
    fullSnap: boolean
}

// Needs to match what's passed to the CellDLEditor component as `viewState`

const defaultGridOptions: GridOptions = {
    gridSpacing: GRID_SPACING,
    resolution: GRID_SNAP_RESOLUTION,
    snapGrid: true,
    fullSnap: true,
}

export const INITIAL_VIEW_STATE: ViewState = {
    showGrid: true,
    gridSpacing: GRID_SPACING,
    snapToGrid: defaultGridOptions.snapGrid ? (defaultGridOptions.fullSnap ? 1 : 0.5) : 0
}

//==============================================================================

class AlignmentGrid {
    #options: GridOptions
    #gridSpacing: number
    #gridLinesElement: SVGPathElement | null = null

    constructor(celldlDiagram: CellDLDiagram, options = {}) {
        this.#options = {...defaultGridOptions, ...options}
        this.#gridSpacing = +(this.#options.gridSpacing || 0)
        if (this.#gridSpacing) {
            const viewbox = getViewbox(celldlDiagram.svgDiagram)
            this.#gridLinesElement = this.#lineElement(this.#gridLines(viewbox))
            celldlDiagram.addEditorElement(this.#gridLinesElement, true)
            this.redraw(viewbox)
        }
    }

    #lineElement(lineDescription: string): SVGPathElement {
        const pathElement = document.createElementNS(SVG_URI, 'path')
        pathElement.classList.add(EDITOR_GRID_CLASS)
        pathElement.setAttribute('d', lineDescription)
        return pathElement
    }

    #gridMultiple(x: number): number {
        return this.#gridSpacing * Math.round(x / this.#gridSpacing)
    }

    #gridLines(viewbox: Extent) {
        const left = this.#gridMultiple(viewbox[0] - this.#gridSpacing)
        const top = this.#gridMultiple(viewbox[1] - this.#gridSpacing)
        const right = this.#gridMultiple(viewbox[0] + viewbox[2] + this.#gridSpacing)
        const bottom = this.#gridMultiple(viewbox[1] + viewbox[3] + this.#gridSpacing)
        return [
            ...[...range(top, bottom, this.#gridSpacing)].map((y) => `M${left},${y}L${right},${y}`),
            ...[...range(left, right, this.#gridSpacing)].map((x) => `M${x},${top}L${x},${bottom}`)
        ].join(' ')
    }

    #fullAlign(x: number): number {
        return this.#options.gridSpacing * Math.round(x / this.#options.gridSpacing)
    }

    #partAlign(x: number, resolution: number): number {
        // We make the grid 2x finer and so only snap
        // if within +/-25% of original grid.
        const sp = resolution * this.#options.gridSpacing
        const a = sp * Math.round(x / sp)
        return a % this.#options.gridSpacing === 0 ? a : x
    }

    align(point: PointLike, options: GridAlignOptions = {}): Point {
        const alignOptions = {...this.#options, ...options}
        if (alignOptions.snapGrid && alignOptions.gridSpacing !== 0) {
            const alignMethod = alignOptions.fullSnap ? this.#fullAlign.bind(this) : this.#partAlign.bind(this)
            const resolution = alignOptions.resolution
            if (options.noAlign || (options.noAlignX && options.noAlignY)) {
                return Point.fromPoint(point)
            } else if (!options.noAlignX && !options.noAlignY) {
                return new Point(alignMethod(point.x, resolution), alignMethod(point.y, resolution))
            } else if (options.noAlignX) {
                return new Point(point.x, alignMethod(point.y, resolution))
            } else if (options.noAlignY) {
                return new Point(alignMethod(point.x, resolution), point.y)
            }
        }
        return Point.fromPoint(point)
    }

    setOptions(options = {}) {
        this.#options = {...this.#options, ...options}
    }

    show(visible: boolean = true) {
        if (this.#gridLinesElement) {
            if (visible) {
                this.#gridLinesElement.removeAttribute('visibility')
            } else {
                this.#gridLinesElement.setAttribute('visibility', 'hidden')
            }
        }
    }

    redraw(viewbox: Extent) {
        if (this.#gridLinesElement) {
            this.#gridLinesElement.setAttribute('d', this.#gridLines(viewbox))
        }
    }
}

//==============================================================================

class IntervalGuide {
    #centre: number
    #svgElement: SVGPathElement
    #useCount: number = 0

    constructor(position: number, type: string, extent: [number, number]) {
        this.#centre = position
        this.#useCount = 1
        this.#svgElement = document.createElementNS(SVG_URI, 'path')
        this.#svgElement.classList.add('alignment-guide')
        if (type === 'H') {
            this.#svgElement.setAttribute('d', `M${extent[0]},${position}h${extent[1]}`)
        } else {
            this.#svgElement.setAttribute('d', `M${position},${extent[0]}v${extent[1]}`)
        }
    }

    get centre() {
        return this.#centre
    }

    get svgElement() {
        return this.#svgElement
    }

    get useCount() {
        return this.#useCount
    }

    addUser() {
        this.#useCount += 1
    }

    removeUser() {
        this.#useCount -= 1
        if (this.#useCount <= 0) {
            this.#svgElement.remove()
        }
    }

    show(visible: boolean = true) {
        if (visible) {
            this.#svgElement.classList.add('visible')
        } else {
            this.#svgElement.classList.remove('visible')
        }
    }
}

//==============================================================================

class ComponentGuideGroup {
    #svgGroup: SVGGElement
    #intervalGuides: IntervalGuide[] = []
    #lastMatched: IntervalGuide | null = null
    #extent: [number, number]
    #type: string // 'H' | 'V'

    constructor(type: string, extent: [number, number]) {
        this.#svgGroup = document.createElementNS(SVG_URI, 'g')
        this.#svgGroup.id = `${type}-alignment-guides`
        this.#extent = extent
        this.#type = type
    }

    get svgGroup() {
        return this.#svgGroup
    }

    add(position: number): IntervalGuide {
        const n = this.match(position)
        let guide: IntervalGuide
        if (n >= 0) {
            // @ts-expect-error: `n` is a valid index
            guide = this.#intervalGuides[n]
            guide.addUser()
        } else {
            guide = new IntervalGuide(position, this.#type, this.#extent)
            this.#intervalGuides.splice(-(n + 1), 0, guide)
            this.#svgGroup.appendChild(guide.svgElement)
        }
        return guide
    }

    match(position: number): number {
        if (this.#lastMatched !== null) {
            this.#lastMatched.show(false)
            this.#lastMatched = null
        }
        let L = 0
        let R = this.#intervalGuides.length - 1
        while (L <= R) {
            const m = Math.floor((L + R) / 2)
            // @ts-expect-error: `m` is a valid index
            const delta = position - this.#intervalGuides[m].centre
            if (Math.abs(delta) < EPSILON) {
                return m
            } else if (delta < 0) {
                R = m - 1
            } else if (delta > 0) {
                L = m + 1
            }
        }
        // want position at which to insert new interval guide (L+1)
        return -(L + 1)
    }

    remove(position: number) {
        const n = this.match(position)
        if (n >= 0) {
            // @ts-expect-error: `n` is a valid index
            this.#intervalGuides[n].removeUser()
            // @ts-expect-error: `n` is a valid index
            if (this.#intervalGuides[n].useCount <= 0) {
                this.#intervalGuides.splice(n, 1)
            }
        }
    }

    show(position: number): number | null {
        const guideIndex = this.match(position)
        if (guideIndex >= 0) {
            // @ts-expect-error: `guideIndex` is a valid index
            this.#lastMatched = this.#intervalGuides[guideIndex]
            // @ts-expect-error: `guideIndex` is a valid index
            this.#lastMatched.show()
            // @ts-expect-error: `guideIndex` is a valid index
            return this.#lastMatched.centre
        } else {
            return 0
        }
    }

    setTransform(viewbox: Extent) {
        if (this.#type === 'H') {
            const scale = viewbox[2] / this.#extent[1]
            this.#svgGroup.setAttribute(
                'transform',
                `matrix(${scale}, 0, 0, 1, ${viewbox[0] - scale * this.#extent[0]}, 0)`
            )
        } else {
            const scale = viewbox[3] / this.#extent[1]
            this.#svgGroup.setAttribute(
                'transform',
                `matrix(1, 0, 0, ${scale}, 0, ${viewbox[1] - scale * this.#extent[0]})`
            )
        }
    }
}

//==============================================================================

class ComponentGuides {
    #horizontalGuideGroup: ComponentGuideGroup
    #verticalGuideGroup: ComponentGuideGroup
    #knownComponents: Set<CellDLMoveableObject> = new Set()

    constructor(celldlDiagram: CellDLDiagram) {
        const extent = getViewbox(celldlDiagram.svgDiagram)
        this.#horizontalGuideGroup = new ComponentGuideGroup('H', [extent[0], extent[2]])
        this.#verticalGuideGroup = new ComponentGuideGroup('V', [extent[1], extent[3]])
        celldlDiagram.addEditorElement(this.#horizontalGuideGroup.svgGroup)
        celldlDiagram.addEditorElement(this.#verticalGuideGroup.svgGroup)
    }

    addComponent(component: CellDLMoveableObject) {
        if (!this.#knownComponents.has(component)) {
            const centroid = component.celldlSvgElement!.centroid
            this.#horizontalGuideGroup.add(centroid.y)
            this.#verticalGuideGroup.add(centroid.x)
            this.#knownComponents.add(component)
        }
    }

    matchGuide(component: CellDLMoveableObject): Array<number | null> {
        this.removeComponent(component)
        const centroid = component.celldlSvgElement!.centroid
        return [this.#horizontalGuideGroup.show(centroid.y), this.#verticalGuideGroup.show(centroid.x)]
    }

    removeComponent(component: CellDLMoveableObject) {
        if (this.#knownComponents.has(component)) {
            const centroid = component.celldlSvgElement!.centroid
            this.#horizontalGuideGroup.remove(centroid.y)
            this.#verticalGuideGroup.remove(centroid.x)
            this.#knownComponents.delete(component)
        }
    }

    setTransform(viewbox: Extent) {
        this.#horizontalGuideGroup.setTransform(viewbox)
        this.#verticalGuideGroup.setTransform(viewbox)
    }
}

//==============================================================================

class EditGuides {
    static #instance: EditGuides | null = null

    #alignmentGrid: AlignmentGrid | null = null
    #componentGuides: ComponentGuides | null = null

    private constructor() {
        if (EditGuides.#instance) {
            throw new Error('Use EditGuides.instance instead of `new`')
        }
        EditGuides.#instance = this
    }

    static get instance() {
        if (!EditGuides.#instance) {
            EditGuides.#instance = new EditGuides()
        }
        return EditGuides.#instance
    }

    gridAlign(point: PointLike, options: GridAlignOptions = {}): Point {
        return this.#alignmentGrid ? this.#alignmentGrid.align(point, options) : Point.fromPoint(point)
    }

    addGuide(component: CellDLMoveableObject) {
        if (this.#componentGuides) {
            this.#componentGuides.addComponent(component)
        }
    }

    matchGuide(component: CellDLMoveableObject): Array<number | null> {
        return this.#componentGuides ? this.#componentGuides.matchGuide(component) : [null, null]
    }

    newDiagram(celldlDiagram: CellDLDiagram, showGrid: boolean) {
        this.#alignmentGrid = new AlignmentGrid(celldlDiagram)
        this.setState({showGrid: showGrid})
        this.#componentGuides = new ComponentGuides(celldlDiagram)
    }

    setState(state: ViewState) {
        if (this.#alignmentGrid) {
            if (state.showGrid !== undefined) {
                this.#alignmentGrid.show(state.showGrid)
            }
            if (state.snapToGrid !== undefined) {
                this.#alignmentGrid.setOptions({
                    snapGrid: state.snapToGrid > 0,
                    fullSnap: state.snapToGrid === 1
                })
            }
        }
    }

    viewboxUpdated(viewbox: Extent) {
        if (this.#alignmentGrid) {
            this.#alignmentGrid.redraw(viewbox)
        }
        if (this.#componentGuides) {
            this.#componentGuides.setTransform(viewbox)
        }
    }

    removeGuide(component: CellDLMoveableObject) {
        if (this.#componentGuides) {
            this.#componentGuides.removeComponent(component)
        }
    }
}

//==============================================================================

export const editGuides = EditGuides.instance

//==============================================================================
