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

import * as vue from 'vue'

import { CONNECTION_SPLAY_PADDING, MAX_CONNECTION_SPLAY_PADDING } from '@renderer/common/styling'
import { CONNECTION_WIDTH, SELECTION_STROKE_WIDTH } from '@renderer/common/styling'
import { Point, type PointLike, PointMath } from '@renderer/common/points'
import { base64Svg, svgCircle } from '@renderer/common/svgUtils'
import type { UndoMovePosition } from '@editor/editor/undoredo'

import { CELLDL_CLASS, type CellDLObject } from '@editor/celldlObjects/index'
import { Bounds, type RestrictedValue } from '@editor/geometry/index'
import { FixedControlRect } from '@editor/geometry/controls'
import { Transform } from '@editor/geometry/transforms'

//==============================================================================

const CONDUIT_SELECTION_RADIUS = 9

//==============================================================================

export function setInternalIds(svgElement: SVGGraphicsElement, previousId: string = '') {
    const id = svgElement.id
    for (const element of svgElement.querySelectorAll(`[id]`)) {
        if (element.id) {
            if (previousId !== '' && element.id.startsWith(`${previousId}-`)) {
                element.id = `${id}${element.id.substring(previousId.length)}`
            } else {
                element.id = `${id}-${element.id}`
            }
        }
    }
    for (const element of svgElement.querySelectorAll('use')) {
        const link = element.getAttribute('xlink:href')
        if (link?.startsWith('#')) {
            if (previousId !== '' && link.startsWith(`#${previousId}-`)) {
                element.setAttribute('xlink:href', `#${id}${link.substring(previousId.length + 1)}`)
            } else {
                element.setAttribute('xlink:href', `#${id}-${link.substring(1)}`)
            }
        }
    }
}

//==============================================================================

export class CellDLSVGElement {
    #bounds!: Bounds
    #centroid!: Point
    #centroidOffset: Point = new Point(0.5, 0.5)
    #cornerOffsets!: [Point, Point, Point, Point] // Wrt centroid, anticlockwise from bottom right
    #selected: boolean = false
    #selectionClasses: Set<string> = new Set()
    #selectionElement: SVGGraphicsElement
    #size: Point = new Point()
    #svgElement: SVGGraphicsElement
    #topLeft!: Point
    #globalTransform: Transform | null = null

    constructor(
        readonly celldlObject: CellDLObject,
        svgElement: SVGGraphicsElement | null
    ) {
        if (svgElement === null) {
            throw new Error(`CellDL object '${celldlObject.id}' isn't represented in SVG...`)
        }
        const svgDiagramElement = celldlObject.celldlDiagram?.svgDiagram
        // get all transformations that are being applied to the SVG element
        this.#globalTransform = Transform.Identity()
        let element = svgElement
        while (element !== svgDiagramElement) {
            const transform = getComputedStyle(element).transform
            if (transform !== 'none') {
                this.#globalTransform = this.#globalTransform.leftMultiply(Transform.fromString(transform))
            }
            element = element.parentNode as SVGGraphicsElement
        }
        if (this.#globalTransform.isIdentity) {
            this.#globalTransform = null
        }
        celldlObject.setCelldlSvgElement(this)
        this.#svgElement = svgElement
        this.#selectionElement = svgElement
        this.#updatedSvgElement()
    }

    get bounds(): Bounds {
        return this.#bounds
    }

    get centroid(): Point {
        return this.#centroid
    }

    get centroidOffset(): Point {
        return this.#centroidOffset
    }

    get corners(): [Point, Point] {
        return [this.#cornerOffsets[0], this.#cornerOffsets[2]]
    }

    get globalTransform() {
        return this.#globalTransform
    }

    get height(): number {
        return this.#size.y
    }

    get id(): string {
        return this.celldlObject.id
    }

    get moveable() {
        return false
    }

    get selected() {
        return this.#selected
    }

    get size() {
        return this.#size
    }

    get svgElement() {
        return this.#svgElement
    }

    get topLeft() {
        return this.#topLeft
    }

    get width(): number {
        return this.#size.x
    }

    setCentroid(centroid: Point) {
        this.#centroid = centroid
    }

    svgBounds(recalculate: boolean = false): Bounds {
        // Get bounds in global coordinates
        return recalculate || this.#bounds === undefined
            ? Bounds.fromSvg(this.#svgElement, this.#globalTransform)
            : this.#bounds
    }

    updateGlobalTransform(transform: Transform): Transform | null {
        if (this.#globalTransform) {
            this.#globalTransform = this.#globalTransform.leftMultiply(transform)
            if (this.#globalTransform.isIdentity) {
                this.#globalTransform = null
            }
        } else {
            this.#globalTransform = transform
        }
        return this.#globalTransform
    }

    #updateBounds() {
        const bounds = this.svgBounds(true)
        this.#size = new Point(bounds.right - bounds.left, bounds.bottom - bounds.top)
        if (this.#centroid) {
            this.#topLeft = this.#centroid.subtract(this.#size.scale(this.#centroidOffset))
            // Get bounds in local coordinates
            this.#bounds = new Bounds(
                this.#topLeft.x,
                this.#topLeft.y,
                this.#topLeft.x + this.#size.x,
                this.#topLeft.y + this.#size.y
            )
        } else {
            this.#topLeft = new Point(bounds.left, bounds.top)
            this.#bounds = bounds
            this.#centroid = this.#size.scale(this.#centroidOffset).add(this.#topLeft)
        }
        const topLeftOffset = this.#size.scale(this.#centroidOffset).scalarScale(-1)
        // Corner offsets are wrt centroid, anticlockwise from bottom right; see comment below in ``boundaryIntersections()``
        const connectionComponentGap: number = CONNECTION_WIDTH / 2 - SELECTION_STROKE_WIDTH / 2
        if (connectionComponentGap !== 0) {
            this.#cornerOffsets = [
                topLeftOffset.add(this.#size).add({ x: connectionComponentGap, y: connectionComponentGap }),
                topLeftOffset
                    .add({ x: this.#size.x, y: 0 })
                    .add({ x: connectionComponentGap, y: -connectionComponentGap }),
                topLeftOffset.add({ x: -connectionComponentGap, y: -connectionComponentGap }),
                topLeftOffset
                    .add({ x: 0, y: this.#size.y })
                    .add({ x: -connectionComponentGap, y: connectionComponentGap })
            ]
        } else {
            this.#cornerOffsets = [
                topLeftOffset.add(this.#size),
                topLeftOffset.add({ x: this.#size.x, y: 0 }),
                topLeftOffset,
                topLeftOffset.add({ x: 0, y: this.#size.y })
            ]
        }
    }

    #updatedSvgElement() {
        // Find the relative offset to the element's centroid
        this.#centroidOffset = new Point(0.5, 0.5)
        if (this.#svgElement.tagName === 'g') {
            const firstChild = this.#svgElement.children.item(0) as SVGGraphicsElement
            if (firstChild.dataset.centreX) {
                this.#centroidOffset = new Point(+firstChild.dataset.centreX, +firstChild.dataset.centreY!)
            }
        }
        // And set the elements bounds relative to its centroid
        this.#updateBounds()
        // Add a dummy rectangle to a group so that it can be activated and selected
        if (
            this.#svgElement.tagName === 'g' &&
            !this.#svgElement.classList.contains(CELLDL_CLASS.Connection) &&
            this.#svgElement.firstElementChild !== null
        ) {
            const bounds = (
                this.#svgElement.classList.contains(CELLDL_CLASS.Compartment)
                    ? Bounds.fromSvg(this.#svgElement.firstChild as SVGGraphicsElement)
                    : Bounds.fromSvg(this.#svgElement)
            ).expand(SELECTION_STROKE_WIDTH / 2)
            // Set height, width and offset of an <svg> child...
            if (this.#svgElement.firstElementChild.tagName === 'svg') {
                const svgChild = this.#svgElement.firstElementChild
                svgChild.setAttribute('x', `${bounds.topLeft.x}px`)
                svgChild.setAttribute('y', `${bounds.topLeft.y}px`)
                svgChild.setAttribute('width', `${bounds.width}px`)
                svgChild.setAttribute('height', `${bounds.height}px`)
            }
            const selectionRect = new FixedControlRect(bounds.asArray()) // versus control rect in RectangularObject
            const svg = selectionRect.svg({
                class: `selection-element parent-id editor-specific ${[...this.#selectionClasses.values()].join(' ')}`
            })
            this.#svgElement.insertAdjacentHTML('beforeend', svg)
            this.#selectionElement = this.#svgElement.lastChild as SVGGraphicsElement
            // Indicate a component is a conduit with a circular mark at its centre
            if (this.celldlObject.isConduit) {
                const centre = new Point(bounds.right - bounds.left, bounds.bottom - bounds.top)
                    .scale(this.#centroidOffset)
                    .add(new Point(bounds.left, bounds.top))
                const svg = svgCircle(centre, CONDUIT_SELECTION_RADIUS, {
                    class: 'selection-element parent-id editor-specific conduit'
                })
                this.#svgElement.insertAdjacentHTML('beforeend', svg)
            }
        }
    }

    #selectionElementMembers(): SVGGraphicsElement[] {
        return this.#selectionElement.tagName === 'g' &&
            this.#selectionElement.classList.contains(CELLDL_CLASS.Connection)
            ? <SVGGraphicsElement[]>[...this.#selectionElement.children]
            : [this.#selectionElement]
    }

    #setSelectionClass(cls: string, enable: boolean) {
        if (enable) {
            for (const element of this.#selectionElementMembers()) {
                element.classList.add(cls)
            }
            this.#selectionClasses.add(cls)
        } else {
            for (const element of this.#selectionElementMembers()) {
                element.classList.remove(cls)
            }
            this.#selectionClasses.delete(cls)
        }
    }

    activate(active = true) {
        this.#setSelectionClass('active', active)
    }

    /**
     * Check if an object can be moved.
     *
     * Called when the pointer is over an object.
     *
     * @param      {SVGGraphicsElement}  _svgElement  The SVG element of the object the pointer is over
     * @return     {boolean}             `true` if the object can be moved, after changing the pointer's
     *                                   cursor to an appropriate form.
     */
    isMoveable(_svgElement: SVGGraphicsElement): boolean {
        return false
    }

    startMove(_svgPoint: PointLike) {}

    move(_svgPoint: PointLike) {}

    endMove() {}

    xBounds(padding: number = 0): [number, number] {
        padding = this.xPadding(padding)
        return [
            this.centroid.x + this.#cornerOffsets[2].x - padding,
            this.centroid.x + this.#cornerOffsets[0].x + padding
        ]
    }

    xPadding(padding: number): number {
        if (padding <= 1.0) {
            return Math.min(padding * this.width, MAX_CONNECTION_SPLAY_PADDING)
        }
        return padding
    }

    yBounds(padding: number = 0): [number, number] {
        padding = this.yPadding(padding)
        return [
            this.centroid.y + this.#cornerOffsets[2].y - padding,
            this.centroid.y + this.#cornerOffsets[0].y + padding
        ]
    }

    yPadding(padding: number): number {
        if (padding <= 1.0) {
            return Math.min(padding * this.height, MAX_CONNECTION_SPLAY_PADDING)
        }
        return padding
    }

    pointOutside(point: PointLike, padding: number = 0): boolean {
        const xBounds = this.xBounds(padding)
        const yBounds = this.yBounds(padding)
        return point.x < xBounds[0] || xBounds[1] < point.x || point.y < yBounds[0] || yBounds[1] < point.y
    }

    /*
     * Return the intersection of the shortest path, normal to an extended bounding
     * box from a point
     *
     * This is done in a way compatible with ``boundaryIntersections()```
     *
     * @param      {PointLike}  point   The point
     * @return     {number}
     */
    boundaryNormalIntersection(point: PointLike, padding: number = CONNECTION_SPLAY_PADDING): Point {
        // Corner offsets are wrt centroid, anticlockwise from bottom right
        let corners: [Point, Point, Point, Point]
        if (padding) {
            // expand corners by padding
            const pad = new Point(this.xPadding(padding), this.yPadding(padding))
            corners = [
                this.#cornerOffsets[0].add({ x: pad.x, y: pad.y }), // BR
                this.#cornerOffsets[1].add({ x: pad.x, y: -pad.y }), // TR
                this.#cornerOffsets[2].add({ x: -pad.x, y: -pad.y }), // TL
                this.#cornerOffsets[3].add({ x: -pad.x, y: pad.y }) // BL
            ]
        } else {
            corners = this.#cornerOffsets
        }
        let deltaX = point.x - this.centroid.x
        let deltaY = point.y - this.centroid.y
        if (deltaX < 0) {
            if (deltaY < 0) {
                if (corners[2].x * deltaY < corners[2].y * deltaX) {
                    deltaX = corners[2].x // left
                } else {
                    deltaY = corners[2].y // top
                }
            } else {
                // deltaY >= 0
                if (corners[3].x * deltaY < corners[3].y * deltaX) {
                    deltaY = corners[3].y // bottom
                } else {
                    deltaX = corners[3].x // left
                }
            }
        } else {
            // deltaX >= 0
            if (deltaY < 0) {
                if (corners[1].x * deltaY < corners[1].y * deltaX) {
                    deltaY = corners[1].y // top
                } else {
                    deltaX = corners[1].x // right
                }
            } else {
                // deltaY >= 0
                if (corners[0].x * deltaY < corners[0].y * deltaX) {
                    deltaX = corners[0].x // right
                } else {
                    deltaY = corners[0].y // bottom
                }
            }
        }
        return this.centroid.add({ x: deltaX, y: deltaY })
    }

    #scaledVerticalOffset(x: number, delta: PointLike): Point {
        return new Point(x, (x * delta.y) / delta.x)
    }

    #scaledHorizontalOffset(y: number, delta: PointLike): Point {
        return new Point((y * delta.x) / delta.y, y)
    }

    boundaryFace(point: PointLike): string {
        if (this.containsPoint(point)) {
            return ''
        }
        const delta = PointMath.subtract(point, this.centroid)
        if (delta.x < 0) {
            if (delta.y < 0) {
                return this.#cornerOffsets[2].x * delta.y < this.#cornerOffsets[2].y * delta.x ? 'L' : 'T'
            } else {
                return this.#cornerOffsets[3].x * delta.y < this.#cornerOffsets[3].y * delta.x ? 'B' : 'L'
            }
        } else {
            if (delta.y < 0) {
                return this.#cornerOffsets[1].x * delta.y < this.#cornerOffsets[1].y * delta.x ? 'T' : 'R'
            } else {
                return this.#cornerOffsets[0].x * delta.y < this.#cornerOffsets[0].y * delta.x ? 'R' : 'B'
            }
        }
    }

    boundaryIntersections(
        point: PointLike,
        padding: number = CONNECTION_SPLAY_PADDING
    ): [Point | null, Point | null, string] {
        /*
         *                +---dx---+
         *                 \       |
         *                  \      |
         *                   \     |
         *              2  ---\---------------------------  1
         *                |    \   |                      |
         *                |     \  |                      |
         *                |      \ dh                     |
         *                |       \|                      |
         *                |---dw---o                      |
         *              3  -------------------------------  0
         *
         *
         *    TOP         dh/dw     <  dy/dx  <      dh/(w-dw)
         *    RIGHT     dh/(w-dw)                (h-dh)/(w-dw)
         *    BOTTOM  (h-dh)/(w-dw)                (h-dh)/dw
         *    LEFT      (h-dh)/dw                     dh/dw
         *
         *
         *    Four quadrants wrt centroid:
         *
         *    +deltaX, +deltaY     bottom-right corner  BR  0   (w-dw)  (h-dh)
         *    +deltaX, -deltaY     top-right corner     TR  1   (w-dw)   -dh
         *    -deltaX, -deltaY     top-left corner      TL  2    -dw     -dh
         *    -deltaX, +deltaY     bottom-left corner   BL  3    -dw    (h-dh)
         *
         *    this.#cornerOffsets is wrt centroid, anticlockwise from bottom right
         */
        if (this.containsPoint(point)) {
            return [null, null, '']
        }

        const delta = PointMath.subtract(point, this.centroid)
        let offset: Point
        let face: string = ''
        const pad = new Point(this.xPadding(padding), this.yPadding(padding))
        let paddingOffset: Point = new Point()

        // Corner offsets are wrt centroid, anticlockwise from bottom right
        // BR, TR, TL, BL
        //  0   1   2   3
        //
        if (delta.x < 0) {
            if (delta.y < 0) {
                // TL
                if (this.#cornerOffsets[2].x * delta.y < this.#cornerOffsets[2].y * delta.x) {
                    // left
                    face = 'L'
                    offset = this.#scaledVerticalOffset(this.#cornerOffsets[2].x, delta)
                    if (padding) {
                        paddingOffset = this.#scaledVerticalOffset(offset.x - pad.x, delta)
                    }
                } else {
                    // top
                    face = 'T'
                    offset = this.#scaledHorizontalOffset(this.#cornerOffsets[2].y, delta)
                    if (padding) {
                        paddingOffset = this.#scaledHorizontalOffset(offset.y - pad.y, delta)
                    }
                }
            } else {
                // BL
                if (this.#cornerOffsets[3].x * delta.y < this.#cornerOffsets[3].y * delta.x) {
                    // bottom
                    face = 'B'
                    offset = this.#scaledHorizontalOffset(this.#cornerOffsets[3].y, delta)
                    if (padding) {
                        paddingOffset = this.#scaledHorizontalOffset(offset.y + pad.y, delta)
                    }
                } else {
                    // left
                    face = 'L'
                    offset = this.#scaledVerticalOffset(this.#cornerOffsets[3].x, delta)
                    if (padding) {
                        paddingOffset = this.#scaledVerticalOffset(offset.x - pad.x, delta)
                    }
                }
            }
        } else {
            if (delta.y < 0) {
                // TR
                if (this.#cornerOffsets[1].x * delta.y < this.#cornerOffsets[1].y * delta.x) {
                    // top
                    face = 'T'
                    offset = this.#scaledHorizontalOffset(this.#cornerOffsets[1].y, delta)
                    if (padding) {
                        paddingOffset = this.#scaledHorizontalOffset(offset.y - pad.y, delta)
                    }
                } else {
                    // right
                    face = 'R'
                    offset = this.#scaledVerticalOffset(this.#cornerOffsets[1].x, delta)
                    if (padding) {
                        paddingOffset = this.#scaledVerticalOffset(offset.x + pad.x, delta)
                    }
                }
            } else {
                // BR
                if (this.#cornerOffsets[0].x * delta.y < this.#cornerOffsets[0].y * delta.x) {
                    // right
                    face = 'R'
                    offset = this.#scaledVerticalOffset(this.#cornerOffsets[0].x, delta)
                    if (padding) {
                        paddingOffset = this.#scaledVerticalOffset(offset.x + pad.x, delta)
                    }
                } else {
                    // bottom
                    face = 'B'
                    offset = this.#scaledHorizontalOffset(this.#cornerOffsets[0].y, delta)
                    if (padding) {
                        paddingOffset = this.#scaledHorizontalOffset(offset.y + pad.y, delta)
                    }
                }
            }
        }
        if (padding) {
            return [this.centroid.add(offset), this.centroid.add(paddingOffset), face]
        } else {
            return [this.centroid.add(offset), null, face]
        }
    }

    containsPoint(point: PointLike, padding: number = 0): boolean {
        let bounds: [Point, Point]
        if (padding) {
            // expand corners by padding
            const pad = new Point(this.xPadding(padding), this.yPadding(padding))
            bounds = [
                this.#cornerOffsets[2].add({ x: -pad.x, y: -pad.y }), // TL
                this.#cornerOffsets[0].add({ x: pad.x, y: pad.y }) // BR
            ]
        } else {
            bounds = [this.#cornerOffsets[2], this.#cornerOffsets[0]]
        }
        const deltaX = point.x - this.centroid.x
        const deltaY = point.y - this.centroid.y
        return bounds[0].x <= deltaX && deltaX <= bounds[1].x && bounds[0].y <= deltaY && deltaY <= bounds[1].y
    }

    clearControlHandles() {}

    drawControlHandles() {}

    highlight(highlight = true) {
        this.#setSelectionClass('highlight', highlight)
    }

    undoControlMove(_undoPosition: UndoMovePosition) {}

    pointerEvent(_eventType: string, _svgElement: SVGGraphicsElement, _svgCoords: PointLike): boolean {
        return false
    }

    redraw() {}

    remove() {
        this.svgElement.remove()
    }

    select(selected = true) {
        this.#setSelectionClass('selected', selected)
        this.#selected = selected
    }

    limitDirection(_direction: string, _minimum: number | RestrictedValue, _maximum: number | RestrictedValue) {}

    unlimitDirection() {}

    /**
     * Update the SVG of the element with new SVG.
     *
     * Called when an element's properties have been changed.
     */
    async updateSvgElement(svg: string) {
        this.svgElement.innerHTML = `<image href="${base64Svg(svg)}"/>`
        await vue.nextTick()            // Wait for image to render
        this.#updatedSvgElement()
    }
}

//==============================================================================
