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

import SVGPathCommander from 'svg-path-commander'
import type { NormalArray } from 'svg-path-commander'

//==============================================================================

import type { CellDLConnection } from '@editor/celldlObjects/index'
import type { EditorFrame } from '@editor/editor/editorframe'
import type { Point, PointLike } from '@renderer/common/points'
import { svgPathElement } from '@renderer/common/svgUtils'
import type { FixedValue, RestrictedValue } from '@editor/geometry/index'
import { ControlPoint } from '@editor/geometry/controls'
import type { FoundPoint } from '@editor/geometry/pathutils'

import type { BoundedElement } from './boundedelement'

//==============================================================================

export const ID_PART_SEPARATOR = '-'

//==============================================================================

export class PathPoint extends ControlPoint {
    #static: boolean = false

    constructor(
        xValue: RestrictedValue,
        yValue: RestrictedValue,
        readonly component: BoundedElement | null = null,
        static_value: boolean = false
    ) {
        super(xValue, yValue, component)
        this.#static = static_value
    }

    get static() {
        return this.#static || this.fixed
    }
    setStatic(value: boolean = true) {
        this.#static = value
    }

    copy(): PathPoint {
        return new PathPoint(this.xValue, this.yValue, this.component, this.static)
    }
}

//==============================================================================

export class FixedPathPoint extends PathPoint {
    constructor(
        xValue: FixedValue,
        yValue: FixedValue,
        readonly component: BoundedElement | null = null
    ) {
        super(xValue, yValue, component)
    }

    copy(): FixedPathPoint {
        return new FixedPathPoint(this.xValue, this.yValue, this.component)
    }
}

//==============================================================================

export class PathElement {
    #connection: CellDLConnection
    #pathPoints: PathPoint[] = []
    #editorFrame: EditorFrame
    #firstElement: BoundedElement
    #lastElement: BoundedElement
    #moveIndex: number = 0
    #movePoint: PathPoint | null = null
    #pathArray: NormalArray
    #svgElement: SVGPathElement
    #svgParentId: string
    #validPath: boolean = false

    constructor(
        connection: CellDLConnection,
        readonly id: string,
        svgElement: SVGPathElement,
        firstElement: BoundedElement,
        lastElement: BoundedElement
    ) {
        this.#connection = connection
        this.#editorFrame = connection.celldlDiagram.editorFrame!
        this.#svgElement = svgElement
        this.#svgParentId = id.split(ID_PART_SEPARATOR).slice(0, -1).join(ID_PART_SEPARATOR)
        this.#firstElement = firstElement
        this.#firstElement.addPathElement(this)
        this.#lastElement = lastElement
        this.#lastElement.addPathElement(this)

        const description = this.#svgElement.getAttribute('d') as string
        this.#pathArray = SVGPathCommander.normalizePath(description)
        if (this.#pathArray.length >= 2 && this.#pathArray[0][0] === 'M') {
            this.#validPath = true
            this.#svgElement.setAttribute('d', SVGPathCommander.pathToString(this.#pathArray))
        }
        this.setPathPoints(this.#pathArray)
        const simplifiedPath = this.simplifyPathPoints()
        if (simplifiedPath) {
            this.#pathPoints = simplifiedPath
            this.redraw()
        }
    }

    get firstElement() {
        return this.#firstElement
    }

    get lastElement() {
        return this.#lastElement
    }

    get moveIndex() {
        return this.#moveIndex
    }

    get movePoint() {
        return this.#movePoint
    }

    get pathArray() {
        return this.#pathArray
    }

    get svgElement() {
        return this.#svgElement
    }

    protected get pathPoints() {
        return this.#pathPoints
    }

    protected get validPath() {
        return this.#validPath
    }
    protected set validPath(valid: boolean) {
        this.#validPath = valid
    }

    clearControlHandles(selected: boolean) {
        // This only removes handles we know about which is why simplifyPathPoints()
        // needs to remove handles for the points it deletes
        for (let index = 1; index < this.#pathPoints.length - 1; ++index) {
            if (!selected) {
                this.#pathPoints[index]!.removeSvgElement()
            }
        }
    }

    drawControlHandles(selected: boolean) {
        for (let index = 1; index < this.#pathPoints.length - 1; ++index) {
            const pathPoint = this.#pathPoints[index]
            const svgElement = pathPoint!.createSvgElement(this.#editorFrame, '', this.#connection)
            svgElement.id = `${this.#svgParentId}-cp-${index}`
            svgElement.dataset.parentId = this.#svgParentId
            svgElement.dataset.controlIndex = `${this.id}${ID_PART_SEPARATOR}${index}`
            if (selected) {
                svgElement.classList.add('selected')
            }
        }
        this.#movePoint = null
    }

    endMove(selected: boolean=false) {
        this.clearControlHandles(selected)
        const newPoints = this.simplifyPathPoints()
        if (newPoints) {
            this.#pathPoints = newPoints
            this.redraw()
        }
        this.#movePoint = null
    }

    isMoveable(index: number): boolean {
        if (index > 0 && index < this.#pathPoints.length - 1) {
            const pathPoint = this.#pathPoints[index]
            if (!pathPoint!.fixed) {
                this.#movePoint = pathPoint!
                this.#moveIndex = index
                return true
            }
        }
        this.#movePoint = null
        return false
    }

    move(position: PointLike) {
        let redraw = false
        if (this.#movePoint) {
            this.pathPoints.forEach((pathPoint) => pathPoint.clean())
            this.movePathPoint(position)
            this.pathPoints.forEach((pathPoint) => {
                if (pathPoint.redraw()) redraw = true
            })
        }
        return redraw
    }

    protected pathFromPathPoints(): NormalArray {
        const normalArray = this.pathPoints.map((p) => ['L', p.x, p.y])
        normalArray[0]![0] = 'M'
        return normalArray as NormalArray
    }

    redraw() {
        this.#pathArray = this.pathFromPathPoints()
        this.#svgElement.setAttribute('d', SVGPathCommander.pathToString(this.#pathArray))
    }

    remove() {
        this.pathPoints.forEach((cp, _) => {
            if (cp.component) {
                cp.component.removePathElement(this)
            }
        })
    }

    splitPath(splitPoint: FoundPoint, interfaceElement: BoundedElement): SVGPathElement {
        const point = splitPoint.point
        const headArray: NormalArray = this.#pathArray.slice(0, splitPoint.segment! + 1)
        headArray.push(['L', point.x, point.y])

        const tailPoints = this.#pathArray.slice(splitPoint.segment! + 1).map((p: number[]) => {
            return { x: p[1]!, y: p[2]! }
        })
        tailPoints.splice(0, 0, point)
        this.#lastElement.removePathElement(this)
        this.#lastElement = interfaceElement
        this.#lastElement.addPathElement(this)
        this.#pathArray = headArray

        const svgElement = svgPathElement(tailPoints)
        this.#svgElement.setAttribute('d', SVGPathCommander.pathToString(this.#pathArray))
        this.setPathPoints(this.#pathArray)
        svgElement.classList.add(...this.#svgElement.classList.values())
        return svgElement
    }

    startMove(point: PointLike) {
        if (this.#movePoint) {
            this.#movePoint.startMove(point)
        }
    }

    componentBoundingBoxMoved(component: BoundedElement, centroidDelta: Point) {
        for (const index of [0, this.#pathPoints.length - 1]) {
            if (component === this.#pathPoints[index]!.component) {
                this.moveComponentBoundingBox(index, component, centroidDelta)
                return
            }
        }
    }

    componentBoundingBoxResisized(component: BoundedElement, cornerDeltas: [Point, Point]) {
        for (const index of [0, this.#pathPoints.length - 1]) {
            if (component === this.#pathPoints[index]!.component) {
                this.resizeComponentBoundingBox(index, component, cornerDeltas)
                return
            }
        }
    }

    undoControlMove(moveIndex: number, movePoint: Point | null) {
        if (moveIndex > 0 && moveIndex < this.#pathPoints.length - 1 && movePoint) {
            const pathPoint = this.#pathPoints[moveIndex]!
            pathPoint.point = movePoint
            let redraw = false
            this.#pathPoints.forEach((pathPoint) => {
                if (pathPoint.redraw()) redraw = true
            })
            if (redraw) this.redraw()
        }
    }

    protected movePathPoint(_position: PointLike) {}

    protected moveComponentBoundingBox(_index: number, _component: BoundedElement, _centroidDelta: Point) {}

    protected resizeComponentBoundingBox(_index: number, _component: BoundedElement, _cornerDeltas: [Point, Point]) {}

    protected setPathPoints(_pathArray: NormalArray) {}

    protected simplifyPathPoints(): PathPoint[] | null {
        return null
    }
}

//==============================================================================
