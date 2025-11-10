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

import type { EditorFrame } from '@editor/editor/editorframe'
import { editGuides } from '@editor/editor/editguides'
import type { BoundedElement } from '@editor/SVGElements/boundedelement'

import { svgCircle, svgRect } from '@renderer/common/svgUtils'

import { Point, type PointLike, PointMath } from '@renderer/common/points'
import type { StringProperties } from '@renderer/common/types'

//==============================================================================

import { FixedPoint, FixedValue, RestrictedPoint, RestrictedValue } from './index.ts'

//==============================================================================

const CONTROL_POINT_RADIUS = 4

type GRIPPER_STYLES = 'gripper-h' | 'gripper-v'

const GRIPPER_OFFSETS = {
    'gripper-h': { x: (3 * CONTROL_POINT_RADIUS) / 2, y: CONTROL_POINT_RADIUS / 4 },
    'gripper-v': { x: CONTROL_POINT_RADIUS / 4, y: (3 * CONTROL_POINT_RADIUS) / 2 }
}

//==============================================================================

export class ControlPoint extends RestrictedPoint {
    #style: string = ''
    #svgElement: SVGGraphicsElement | null = null

    constructor(
        xValue: RestrictedValue,
        yValue: RestrictedValue,
        readonly component: BoundedElement | null = null
    ) {
        super(xValue, yValue)
    }

    get fixed() {
        return this.xValue.fixed && this.yValue.fixed
    }

    get isConduit() {
        return this.component !== null && this.component.celldlObject.isConduit
    }

    static fromPoint(point: PointLike): ControlPoint {
        return new ControlPoint(new RestrictedValue(point.x), new RestrictedValue(point.y))
    }

    static fromValue(x: number, y: number): ControlPoint {
        return new ControlPoint(new RestrictedValue(x), new RestrictedValue(y))
    }

    colinear(p1: ControlPoint, p2: ControlPoint): boolean {
        return PointMath.colinear(this, p1, p2)
    }

    copy(): ControlPoint {
        return new ControlPoint(this.xValue, this.yValue, this.component)
    }

    createSvgElement(editorFrame: EditorFrame, style: string = ''): SVGGraphicsElement {
        let svg = ''
        if (style in GRIPPER_OFFSETS) {
            const offsets = GRIPPER_OFFSETS[style as GRIPPER_STYLES]
            svg = svgRect(this.point.subtract(offsets), this.point.add(offsets))
        } else if (style === 'fixed') {
            svg = svgCircle(this.point, CONTROL_POINT_RADIUS, { class: 'fixed' })
        } else {
            svg = svgCircle(this.point, CONTROL_POINT_RADIUS)
        }
        if (this.#svgElement) {
            this.#svgElement.remove()
        }
        this.#style = style
        this.#svgElement = editorFrame.addElementAsString(svg) as SVGGraphicsElement
        this.#svgElement.classList.add('control-point', 'selected')
        return this.#svgElement
    }

    removeSvgElement() {
        if (this.#svgElement) {
            this.#svgElement.remove()
            this.#svgElement = null
        }
    }

    reassignPosition(position: PointLike) {
        this.xValue.reassignValue(position.x)
        this.yValue.reassignValue(position.y)
    }

    redraw() {
        if (this.dirty && this.#svgElement) {
            const point = this.point
            if (this.#style in GRIPPER_OFFSETS) {
                const offsets = GRIPPER_OFFSETS[this.#style as GRIPPER_STYLES]
                this.#svgElement.setAttribute('x', `${point.x - offsets.x}`)
                this.#svgElement.setAttribute('y', `${point.y - offsets.y}`)
            } else {
                this.#svgElement.setAttribute('cx', `${point.x}`)
                this.#svgElement.setAttribute('cy', `${point.y}`)
            }
            return true
        }
        return false
    }

    toString(): string {
        return `CP${this.component ? ` ${this.component.id}` : ''}: (${this.xValue.toString()}, ${this.yValue.toString()})`
    }
}

//==============================================================================

export class FixedControlPoint extends ControlPoint {
    constructor(
        xValue: FixedValue,
        yValue: FixedValue,
        readonly component: BoundedElement | null = null
    ) {
        super(xValue, yValue, component)
    }

    copy(): FixedControlPoint {
        return new FixedControlPoint(this.xValue, this.yValue, this.component)
    }

    toString(): string {
        return `FP${this.component ? ` ${this.component.id}` : ''}: (${this.xValue.toString()}, ${this.yValue.toString()})`
    }
}

//==============================================================================

export class ControlRect {
    #gridAlign: boolean = true
    #topLeft!: RestrictedPoint
    #bottomRight!: RestrictedPoint
    #size!: Point
    #centroid!: RestrictedPoint
    #centroidOffset!: Point
    #moveOffset: Point = new Point()
    #svgElement: SVGRectElement | null = null

    constructor(corner_0: RestrictedPoint, corner_1: RestrictedPoint, centroidOffset: Point | null = null) {
        this.setCornerPositions(corner_0, corner_1)
        this.setCentroidOffset(centroidOffset || new Point(0.5, 0.5))
    }

    set gridAlign(align: boolean) {
        this.#gridAlign = align
    }

    get centroid() {
        return this.#centroid
    }

    get dirty() {
        return this.#topLeft.dirty || this.#bottomRight.dirty
    }

    get fixed() {
        return this.#topLeft.fixed && this.#bottomRight.fixed
    }

    get svgElement() {
        return this.#svgElement
    }

    get topLeftPoint() {
        return this.#topLeft.point
    }

    clean() {
        this.#topLeft.clean()
        this.#bottomRight.clean()
    }

    copy(): ControlRect {
        return new ControlRect(this.#topLeft, this.#bottomRight, this.#centroidOffset)
    }

    setCornerPositions(corner_0: RestrictedPoint, corner_1: RestrictedPoint) {
        let x0 = corner_0.xValue,
            y0 = corner_0.yValue
        let x1 = corner_1.xValue,
            y1 = corner_1.yValue
        if (x0.value > x1.value) {
            x0 = corner_1.xValue
            x1 = corner_0.xValue
        }
        if (y0.value > y1.value) {
            y0 = corner_1.yValue
            y1 = corner_0.yValue
        }
        this.#topLeft = new RestrictedPoint(x0, y0)
        this.#bottomRight = new RestrictedPoint(x1, y1)
        this.#size = PointMath.subtract(this.#bottomRight.point, this.#topLeft.point)
    }

    setCentroidOffset(centroidOffset: Point) {
        this.#centroidOffset = centroidOffset
        this.#centroid = RestrictedPoint.fromPoint(this.#size.scale(this.#centroidOffset).add(this.#topLeft.point))
    }

    startMove(point: PointLike) {
        // we need to know offset of pointer from centre of object
        this.#moveOffset = Point.fromPoint(PointMath.subtract(this.#centroid, point))
    }

    move(point: PointLike) {
        const position = this.#moveOffset!.add(point)
        this.reposition(this.#gridAlign ? editGuides.gridAlign(position) : position)
    }

    /**
     * Reposition the rectangle.
     *
     * @param centroid - The new position of the rectangle's centroid.
     */
    reposition(centroid: PointLike) {
        this.#centroid.point = centroid // this will check limits
        this.#topLeft.point = this.#centroid.point.subtract(this.#size.scale(this.#centroidOffset))
        this.#bottomRight.point = PointMath.add(this.#topLeft.point, this.#size)
    }

    svg(attributes: StringProperties = {}) {
        return svgRect(this.#topLeft.point, this.#bottomRight.point, attributes)
    }
}

//==============================================================================

export class FixedControlRect extends ControlRect {
    constructor(bounds: [number, number, number, number]) {
        super(
            new FixedPoint(new FixedValue(bounds[0]), new FixedValue(bounds[1])),
            new FixedPoint(new FixedValue(bounds[2]), new FixedValue(bounds[3]))
        )
    }
}

//==============================================================================

/*
class ControlLine
{
    #start: ControlPoint
    #end: ControlPoint

    constructor(start: ControlPoint, end: ControlPoint)
    {
        this.#start = start
        this.#end = end
    }

    get start()
    {
        return this.#start
    }

    get end()
    {
        return this.#end
    }
}

class HorizontalLine extends ControlLine
{
    constructor(start: ControlPoint, end: ControlPoint)
    {
        if (start.y.value !== end.y.value) {
            throw new Error("Line segment isn't horizontal")
        }
        super(start, end)
    }
}

class VerticalLine  extends ControlLine
{
    constructor(start: ControlPoint, end: ControlPoint)
    {
        if (start.x.value !== end.x.value) {
            throw new Error("Line segment isn't vertical")
        }
        super(start, end)
    }
}

*/

// a sequence of horiz/vert lines
// a sequence of restricted points

//==============================================================================

/*
 *
 *                      (0, 0)--------........p1..........
 *                        p0                  |
 *                                            |
 *                                            |
 *                                            |
 *                                            |
 *                                            |
 *                                            |
 *                                     .....(1, 1)........--------(2, 1)
 *                                            p2                     p3
 *

const x0 = new FixedValue(0.0)
const y0 = new FixedValue(0.0)

const x1 = new RestrictedValue(1.0, 0.8, 1.3)
const y1 = new FixedValue(1.0)

const x2 = new FixedValue(2.0)

const p0 = new FixedPoint(x0, y0)
const p1 = new RestrictedPoint(x1, y0)  // (x1, p0.y)
const p2 = new RestrictedPoint(x1, y1)  // (p1.x, y1)
const p3 = new FixedPoint(x2, y1)

const l0 = new HorizontalLine(p0, p1)
const l1 = new VerticalLine(p1, p2)
const l2 = new HorizontalLine(p2, p3)

 */
