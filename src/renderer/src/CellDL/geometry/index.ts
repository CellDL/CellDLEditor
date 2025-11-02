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

import { editGuides } from '../../components/editor/editguides.ts'
import type { GridAlignOptions } from '../../components/editor/editguides.ts'
import type { Transform } from '../geometry/transforms.ts'
import { round } from '../utils.ts'

import { Point, type PointLike, PointMath } from '../../common/points.ts'

//==============================================================================

export type PointMoveOptions = GridAlignOptions & {
    noOffset?: boolean
}

//==============================================================================

/**
 * [left, top, width, height]
 */
export type Extent = [number, number, number, number]

//==============================================================================

export class Bounds extends Array<number> {
    constructor(left: number, top: number, right: number, bottom: number) {
        super(left, top, right, bottom)
        // Ensure bounds are in ``normal`` order
        if (this[0] > this[2]) {
            ;[this[0], this[2]] = [this[2], this[0]]
        }
        if (this[1] > this[3]) {
            ;[this[1], this[3]] = [this[3], this[1]]
        }
    }

    static fromPoints(pt0: PointLike, pt1: PointLike): Bounds {
        return new Bounds(pt0.x, pt0.y, pt1.x, pt1.y)
    }

    static fromSvg(svgElement: SVGGraphicsElement, globalTransform: Transform | null = null): Bounds {
        const bbox = svgElement.getBBox()
        let topLeft = new Point(bbox.x, bbox.y)
        let bottomRight = new Point(bbox.x + bbox.width, bbox.y + bbox.height)
        if (globalTransform) {
            topLeft = globalTransform.transformPoint(topLeft)
            bottomRight = globalTransform.transformPoint(bottomRight)
        }
        const bounds = new Bounds(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y)
        return bounds
    }

    get height(): number {
        return this[3] - this[1]
    }

    get topLeft(): Point {
        return new Point(this[0], this[1])
    }

    get width(): number {
        return this[2] - this[0]
    }

    asArray(): [number, number, number, number] {
        return [this[0], this[1], this[2], this[3]]
    }

    asPoints(): [Point, Point] {
        return [new Point(this[0], this[1]), new Point(this[2], this[3])]
    }

    equal(bounds: Bounds, epsilon = 0.0001): boolean {
        // Assume bounds are normalised
        return (
            Math.abs(this[0] - bounds[0]) < epsilon &&
            Math.abs(this[1] - bounds[1]) < epsilon &&
            Math.abs(this[2] - bounds[2]) < epsilon &&
            Math.abs(this[2] - bounds[3]) < epsilon
        )
    }

    expand(margin: number): Bounds {
        return new Bounds(this[0] - margin, this[1] - margin, this[2] + margin, this[3] + margin)
    }

    inContainer(container: Bounds): boolean {
        return this[0] >= container[0] && this[2] <= container[2] && this[1] >= container[1] && this[3] <= container[3]
    }
}

//==============================================================================

interface NumericRange {
    minimum: number
    maximum: number
}

//==============================================================================

class IdGenerator {
    static #instance: IdGenerator | null = null
    #nextId: number = 0

    private constructor() {
        if (IdGenerator.#instance) {
            throw new Error('Use `IdGenerator.instance` instead of `new`')
        }
        IdGenerator.#instance = this
    }

    static get instance() {
        return IdGenerator.#instance ?? (IdGenerator.#instance = new IdGenerator())
    }

    get nextId() {
        return (this.#nextId += 1)
    }
}

const idGenerator = IdGenerator.instance

function nextId(prefix: string = ''): string {
    return `${prefix}:${idGenerator.nextId}`
}

//==============================================================================

export class RestrictedValue implements NumericRange {
    #dirty: boolean = false
    #value: number = 0
    #minimum: number | RestrictedValue = -Infinity
    #maximum: number | RestrictedValue = Infinity
    readonly id: string

    constructor(
        value: number = 0,
        rangeStart: number | RestrictedValue = -Infinity,
        rangeEnd: number | RestrictedValue = Infinity
    ) {
        this.#value = value
        if (this.#getValue(rangeStart) <= this.#getValue(rangeEnd)) {
            this.#minimum = rangeStart
            this.#maximum = rangeEnd
        } else {
            this.#minimum = rangeEnd
            this.#maximum = rangeStart
        }
        this.id = nextId('V')
    }

    clean() {
        this.#dirty = false
    }
    get dirty() {
        return this.#dirty
    }

    get fixed() {
        return this.minimum === this.maximum
    }

    get minimum() {
        return this.#getValue(this.#minimum)
    }

    get maximum() {
        return this.#getValue(this.#maximum)
    }

    get value() {
        return this.#value
    }
    set value(value: number) {
        if (this.#value != value) {
            if (value < this.minimum) {
                value = this.minimum
            } else if (value > this.maximum) {
                value = this.maximum
            }
            if (this.#value != value) {
                this.#value = value
                this.#dirty = true
            }
        }
    }

    #getValue(value: number | RestrictedValue): number {
        return typeof value === 'number' ? value : value.value
    }

    copy(): RestrictedValue {
        return new RestrictedValue(this.#value, this.#minimum, this.#maximum)
    }

    adjustValue(delta: number) {
        this.#minimum = this.minimum + delta
        this.#maximum = this.maximum + delta
        this.#value += delta
    }

    narrowRange(minimum: number | RestrictedValue, maximum: number | RestrictedValue) {
        let minValue = minimum
        let maxValue = maximum
        if (this.#getValue(minValue) > this.#getValue(maxValue)) {
            minValue = maximum
            maxValue = minimum
        }
        if (this.#getValue(minValue) > this.minimum) {
            this.#minimum = minValue
        }
        if (this.#getValue(maxValue) < this.maximum) {
            this.#maximum = maxValue
        }
    }

    reassignMaximum(maximum: number | RestrictedValue) {
        this.#maximum = maximum
    }

    reassignMinimum(minimum: number | RestrictedValue) {
        this.#minimum = minimum
    }

    reassignValue(value: number) {
        this.#value = value
    }

    toString() {
        //========
        return `${this.id}: [${round(this.minimum)}, ${round(this.#value)}, ${round(this.maximum)}]`
    }
}

//==============================================================================

export class FixedValue extends RestrictedValue {
    constructor(value: number) {
        super(value, value, value)
    }

    get fixed() {
        return true
    }

    copy(): FixedValue {
        return new FixedValue(this.value)
    }

    narrowRange(_minimum: number, _maximum: number) {
    }

    reassignValue(value: number) {
        super.reassignValue(value)
        super.reassignMinimum(value)
        super.reassignMaximum(value)
    }
}

//==============================================================================

export class ComputedValue extends RestrictedValue {
    #value: () => number

    constructor(
        value: () => number,
        minimum: number | RestrictedValue = -Infinity,
        maximum: number | RestrictedValue = Infinity
    ) {
        super(value(), minimum, maximum)
        this.#value = value
    }

    get dirty() {
        return true // Always recompute
    }

    get value() {
        super.value = this.#value()
        return super.value
    }
    set value(_: number) {
    }
}

//==============================================================================

export class RestrictedPoint {
    #moveOffset: Point = new Point()
    #xValue: RestrictedValue
    #yValue: RestrictedValue

    constructor(xValue: RestrictedValue, yValue: RestrictedValue) {
        this.#xValue = xValue
        this.#yValue = yValue
    }

    static fromPoint(point: PointLike): RestrictedPoint {
        return new RestrictedPoint(new RestrictedValue(point.x), new RestrictedValue(point.y))
    }

    get dirty() {
        return this.#xValue.dirty || this.#yValue.dirty
    }

    get fixed() {
        return this.#xValue.fixed && this.#yValue.fixed
    }

    get point(): Point {
        return new Point(this.#xValue.value, this.#yValue.value)
    }
    set point(point: PointLike) {
        this.#xValue.value = point.x
        this.#yValue.value = point.y
    }

    get x() {
        return this.#xValue.value
    }
    get y() {
        return this.#yValue.value
    }

    get xValue() {
        return this.#xValue
    }
    set xValue(value: RestrictedValue) {
        this.#xValue = value
    }

    get yValue() {
        return this.#yValue
    }
    set yValue(value: RestrictedValue) {
        this.#yValue = value
    }

    clean() {
        this.#xValue.clean()
        this.#yValue.clean()
    }

    adjustValue(delta: PointLike) {
        this.xValue.adjustValue(delta.x)
        this.yValue.adjustValue(delta.y)
    }

    copy(): RestrictedPoint {
        return new RestrictedPoint(this.#xValue, this.#yValue)
    }

    move(point: PointLike, options: PointMoveOptions = {}) {
        const newPoint = options.noOffset ? point : this.offsetPoint(point)
        this.point = editGuides.gridAlign(newPoint, options)
    }

    offsetPoint(point: PointLike): Point {
        return this.#moveOffset!.add(point)
    }

    reassignValue(point: PointLike) {
        this.xValue.reassignValue(point.x)
        this.yValue.reassignValue(point.y)
    }

    startMove(point: PointLike) {
        // we need to know offset of pointer from centre (or topleft) of object
        this.#moveOffset = Point.fromPoint(PointMath.subtract(this.point, point))
    }

    toString(): string {
        return `RP: (${round(this.x)}, ${round(this.y)})`
    }
}

//==============================================================================

export class FixedPoint extends RestrictedPoint {
    constructor(xValue: FixedValue, yValue: FixedValue) {
        super(xValue, yValue)
    }
}

//==============================================================================
