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
import type { ShapeTypes } from 'svg-path-commander'

//==============================================================================

import type { PointLike } from '@renderer/common/points'
import { alert } from '@editor/editor/alerts'
import { undoRedo, type EditorUndoAction, type UndoMovePosition } from '@editor/editor/undoredo'

import type { CellDLConnection } from '@editor/celldlObjects/index'
import { ConnectionStyle } from '@editor/connections/index'

//==============================================================================

import { ID_PART_SEPARATOR, type PathElement } from './pathelement'
import { LinearPath } from './linearpath'
import { RectilinearPath } from './rectilinearpath'
import { CellDLSVGElement } from './index'
import type { BoundedElement } from './boundedelement'

//==============================================================================

const shapeTags = ['line', 'polyline', 'polygon', 'ellipse', 'circle', 'rect', 'glyph']
const svgPathTag = 'path'
const svgGroupTag = 'g'

//==============================================================================

export class SvgConnection extends CellDLSVGElement {
    #pathElements: PathElement[] = []
    #moveableElement: PathElement | null = null
    #undoMoveAction: EditorUndoAction | null = null

    constructor(connection: CellDLConnection, svgElement: SVGGraphicsElement, style: ConnectionStyle) {
        super(connection, svgElement)

        const svgPaths: SVGPathElement[] = []
        if (shapeTags.includes(svgElement.tagName)) {
            SVGPathCommander.shapeToPath(svgElement as ShapeTypes, true)
        }
        if (svgElement.tagName === svgPathTag) {
            svgPaths.push(<SVGPathElement>svgElement)
        } else if (svgElement.tagName === svgGroupTag) {
            for (const element of svgElement.children) {
                if (shapeTags.includes(element.tagName)) {
                    SVGPathCommander.shapeToPath(element as ShapeTypes, true)
                }
                if (element.tagName === 'path') {
                    svgPaths.push(<SVGPathElement>element)
                } else {
                    throw new Error(`Connection ${connection.id}: SVG paths are not all 'path' elements`)
                }
            }
        } else {
            throw new Error(`Connection ${connection.id}: SVG is not a 'path' element`)
        }

        const connectorElements = connection.connectedObjects.map((cn) => <BoundedElement>cn.celldlSvgElement!)
        if (svgPaths.length === connectorElements.length - 1) {
            for (let n = 0; n < svgPaths.length; n += 1) {
                const pathId = `${svgElement.id}${ID_PART_SEPARATOR}${n + 1}`
                const svgPath = svgPaths[n]
                this.#pathElements[n] =
                    // @ts-expect-error: `n < svgPaths.length` and so `svgPath` is defined
                    style === ConnectionStyle.Rectilinear || svgPath.classList.contains('rectilinear')
                        ? new RectilinearPath(
                              connection.celldlDiagram!,
                              pathId,
                              // @ts-expect-error
                              svgPath,
                              connectorElements[n],
                              connectorElements[n + 1]
                          )
                        : new LinearPath(
                              connection.celldlDiagram!,
                              pathId,
                              // @ts-expect-error
                              svgPath,
                              connectorElements[n],
                              connectorElements[n + 1]
                          )
            }
        } else {
            alert.elementError(`Connection ${connection.id}: wrong number of paths for connectors`, this.svgElement)
        }
    }

    get pathElements(): PathElement[] {
        return this.#pathElements
    }

    clearControlHandles() {
        this.#pathElements.forEach((element) => element.clearControlHandles())
    }

    drawControlHandles() {
        this.#pathElements.forEach((element) => element.drawControlHandles())
    }

    endMove() {
        if (this.#moveableElement) {
            this.#moveableElement.endMove()
            this.#moveableElement = null
            this.#undoMoveAction = null
        }
    }

    isMoveable(svgElement: SVGGraphicsElement): boolean {
        if (svgElement.dataset.controlIndex) {
            const indices = svgElement.dataset.controlIndex
                .split(ID_PART_SEPARATOR)
                .slice(-2)
                .map((n) => +n)
            if (indices[0] > 0 && indices[0] <= this.#pathElements.length) {
                if (this.#pathElements[indices[0] - 1].isMoveable(indices[1])) {
                    this.#moveableElement = this.#pathElements[indices[0] - 1]
                    return true
                }
            }
        }
        this.#moveableElement = null
        return false
    }

    move(position: PointLike) {
        if (this.#moveableElement && this.#undoMoveAction) {
            if (this.#moveableElement.move(position)) {
                this.#undoMoveAction.endMove(this.#moveableElement.moveIndex, this.#moveableElement.movePoint!.point)
                this.#moveableElement.redraw()
            }
        }
    }

    redraw() {
        this.#pathElements.forEach((element) => element.redraw())
        super.redraw()
    }

    remove() {
        super.remove()
        this.#pathElements.forEach((element) => element.remove())
    }

    startMove(svgPoint: PointLike) {
        if (this.#moveableElement && this.#moveableElement.movePoint) {
            this.#undoMoveAction = undoRedo.undoMoveAction()
            this.#undoMoveAction.addObjectDetails(this.celldlObject)
            this.#undoMoveAction.startMove(this.#moveableElement.moveIndex, this.#moveableElement.movePoint.point)
            this.#moveableElement.startMove(svgPoint)
        }
    }

    undoControlMove(undoPosition: UndoMovePosition) {
        if (this.#moveableElement && undoPosition) {
            this.#moveableElement.undoControlMove(undoPosition[0], undoPosition[1])
        }
    }
}

//==============================================================================
