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

import type { CellDLConnectedObject, CellDLObject } from '@editor/celldlObjects'
import { svgRect } from '@renderer/common/svgUtils'
import { Point } from '@renderer/common/points'
import { Bounds, ComputedValue, RestrictedValue } from '@editor/geometry'
import { ControlPoint } from '@editor/geometry/controls'

import { type CellDLEditor, getElementId } from '.'
//import { CONTEXT_MENU } from './contextmenu.ts'
import { editGuides } from './editguides'
import { type EditorFrame, EDITOR_FRAME_ID } from './editorframe'

//==============================================================================

const SELECTION_BOX_ID = 'editor-selection-box'

//==============================================================================

export class SelectionBox {
    #bottomRight: ControlPoint
    #controlPoints: ControlPoint[] = []
    #drawing: boolean = false
    #editor: CellDLEditor
    #editorFrame: EditorFrame
    #movePoint: ControlPoint | null = null
    #panStart: Point | null = null
    #panTopLeft: Point | null = null
    #selectedObjects: Map<string, CellDLObject> = new Map()
    #selectionRect: SVGRectElement | null = null
    #size: Point
    #startPoint: Point
    #topLeft: ControlPoint
    #xMin: RestrictedValue | null = null
    #xMax: RestrictedValue | null = null
    #yMin: RestrictedValue | null = null
    #yMax: RestrictedValue | null = null

    constructor(editor: CellDLEditor, startPoint: DOMPoint) {
        this.#editor = editor
        this.#editorFrame = editor.editorFrame!
        this.#startPoint = Point.fromPoint(editGuides.gridAlign(startPoint))
        this.#topLeft = ControlPoint.fromPoint(this.#startPoint)
        this.#bottomRight = ControlPoint.fromPoint(this.#startPoint)
        this.#size = new Point(0, 0)
        this.#drawing = true
    }

    get bounds(): Bounds {
        return Bounds.fromPoints(this.#topLeft, this.#bottomRight)
    }

    get count() {
        return [...this.#selectedObjects.keys()].length
    }

    get selectedObjects() {
        return [...this.#selectedObjects.values()]
    }

    #drawTo(domPoint: DOMPoint) {
        const point = editGuides.gridAlign(domPoint)
        this.#topLeft = ControlPoint.fromPoint({
            x: Math.min(this.#startPoint.x, point.x),
            y: Math.min(this.#startPoint.y, point.y)
        })
        this.#bottomRight = ControlPoint.fromPoint({
            x: Math.max(this.#startPoint.x, point.x),
            y: Math.max(this.#startPoint.y, point.y)
        })
        this.#updateSelectionRect()
    }

    #updateSelectionRect(resized = true) {
        if (resized) {
            this.#size = new Point(this.#bottomRight.x - this.#topLeft.x, this.#bottomRight.y - this.#topLeft.y)
        }
        if (this.#selectionRect) {
            this.#selectionRect.setAttribute('x', `${this.#topLeft.x}`)
            this.#selectionRect.setAttribute('y', `${this.#topLeft.y}`)
            if (resized) {
                this.#selectionRect.setAttribute('width', `${this.#size.x}`)
                this.#selectionRect.setAttribute('height', `${this.#size.y}`)
            }
        } else {
            this.#selectionRect = <SVGRectElement>(
                this.#editorFrame.addElementAsString(
                    svgRect(this.#topLeft, this.#bottomRight, { class: 'selection-rect' })
                )
            )
            this.#selectionRect.id = SELECTION_BOX_ID
        }
        this.#setSelectedObjects()
    }

    pointInside(point: DOMPoint): boolean {
        return (
            this.#topLeft.x < point.x &&
            point.x < this.#bottomRight.x &&
            this.#topLeft.y < point.y &&
            point.y < this.#bottomRight.y
        )
    }

    makeCompartment() {
        if (this.count) {
            this.#editor.celldlDiagram!.createCompartment(Bounds.fromPoints(this.#topLeft, this.#bottomRight), [
                ...this.#selectedObjects.values()
            ])
        }
    }

    pointerEvent(event, point: DOMPoint): boolean {
        if (this.#drawing) {
            if (event.type === 'pointermove') {
                this.#drawTo(point)
            } else if (event.type === 'pointerup') {
                this.#drawing = false
                // Allow new SelectionBox to be moved and resized
                this.drawControlHandles()
            }
            return true
        } else if (this.#movePoint || this.#panStart) {
            if (event.type === 'pointermove') {
                if (this.#movePoint !== null) {
                    this.#movePoint.point = editGuides.gridAlign(point)
                } else if (this.#panStart !== null) {
                    const delta = this.#panStart.subtract(point)
                    this.#topLeft.point = editGuides.gridAlign(this.#panTopLeft!.subtract(delta))
                    this.#bottomRight.point = this.#topLeft.point.add(this.#size)
                }
                this.#updateSelectionRect(this.#movePoint !== null)
                this.#redrawControlHandles()
            } else if (event.type === 'pointerup') {
                this.#movePoint = null
                this.#panStart = null
            }
            return true
        } else {
            const element = event.target as SVGGraphicsElement
            const currentId = getElementId(element)
            if (currentId === SELECTION_BOX_ID && element.parentElement?.id === EDITOR_FRAME_ID) {
                const currentIndex = element.dataset.controlIndex ? +element.dataset.controlIndex : -1
                if (event.type === 'pointerdown') {
                    if (currentIndex >= 0) {
                        const controlPoint = this.#controlPoints[currentIndex]
                        this.#movePoint = controlPoint
                        this.#panStart = null
                    } else {
                        this.#movePoint = null
                        this.#panStart = Point.fromPoint(point)
                        this.#panTopLeft = Point.fromPoint(this.#topLeft.point)
                    }
                }
                return true
            }
        }
        return false
    }

    close() {
        this.#updateContextMenu(false)
        if (this.#selectionRect) {
            this.#unsetSelectedObjects()
            this.clearControlHandles()
            this.#editorFrame.removeElement(this.#selectionRect)
            this.#selectionRect = null
        }
    }

    clearControlHandles() {
        for (const controlPoint of this.#controlPoints) {
            controlPoint.removeSvgElement()
        }
        this.#controlPoints = []
    }

    drawControlHandles() {
        if (!this.#selectionRect) {
            return
        }
        this.#xMin = new RestrictedValue(this.#topLeft.x)
        this.#xMax = new RestrictedValue(this.#bottomRight.x)
        this.#xMin.reassignMaximum(this.#xMax)
        this.#xMax.reassignMinimum(this.#xMin)
        const xMid = new ComputedValue((() => (this.#xMin!.value + this.#xMax!.value) / 2).bind(this))

        this.#yMin = new RestrictedValue(this.#topLeft.y)
        this.#yMax = new RestrictedValue(this.#bottomRight.y)
        this.#yMin.reassignMaximum(this.#yMax)
        this.#yMax.reassignMinimum(this.#yMin)
        const yMid = new ComputedValue((() => (this.#yMin!.value + this.#yMax!.value) / 2).bind(this))

        this.#controlPoints = [
            new ControlPoint(this.#xMin, this.#yMin),
            new ControlPoint(xMid, this.#yMin),
            new ControlPoint(this.#xMax, this.#yMin),
            new ControlPoint(this.#xMax, yMid),
            new ControlPoint(this.#xMax, this.#yMax),
            new ControlPoint(xMid, this.#yMax),
            new ControlPoint(this.#xMin, this.#yMax),
            new ControlPoint(this.#xMin, yMid)
        ]
        this.#topLeft = this.#controlPoints[0]
        this.#bottomRight = this.#controlPoints[4]
        let index = 0
        const styles = ['', 'gripper-h', '', 'gripper-v', '', 'gripper-h', '', 'gripper-v']
        const cursors = ['move', 'ns-resize', 'move', 'ew-resize', 'move', 'ns-resize', 'move', 'ew-resize']
        for (const controlPoint of this.#controlPoints) {
            const svgElement = controlPoint.createSvgElement(this.#editorFrame, styles[index])
            svgElement.style.setProperty('cursor', cursors[index])
            svgElement.dataset.parentId = this.#selectionRect.id
            svgElement.dataset.controlIndex = `${index}`
            index += 1
        }
        this.#movePoint = null
        this.#selectionRect.style.setProperty('cursor', 'grab')
        this.#updateContextMenu(this.count > 0)
    }

    #redrawControlHandles() {
        for (const controlPoint of this.#controlPoints) {
            controlPoint.redraw()
        }
        this.#updateContextMenu(this.count > 0)
    }

    #setSelectedObjects() {
        const selectedItems = this.#editor
            .celldlDiagram!.objectsContainedIn(this.bounds)
            .filter((c) => c.exact)
            .map((c) => c.object)
        const fullSelection = [...selectedItems]
        for (const component of selectedItems) {
            if (component.isConnectable) {
                fullSelection.push(...(<CellDLConnectedObject>component).connections.values())
            }
        }
        const selectedObjects: Map<string, CellDLObject> = new Map()
        for (const object of fullSelection) {
            if (!selectedObjects.has(object.id)) {
                if (!this.#selectedObjects.has(object.id)) {
                    object.select(true)
                }
                selectedObjects.set(object.id, object)
            }
        }
        for (const [id, object] of this.#selectedObjects.entries()) {
            if (!selectedObjects.has(id)) {
                object.select(false)
            }
        }
        this.#selectedObjects = selectedObjects
    }

    #unsetSelectedObjects() {
        for (const object of this.#selectedObjects.values()) {
            object.select(false)
        }
    }

    #updateContextMenu(enabled: boolean) {
        this.#editor.enableContextMenuItem(CONTEXT_MENU.DELETE, enabled)
        this.#editor.enableContextMenuItem(CONTEXT_MENU.GROUP_OBJECTS, enabled)
    }

    updateSelectedObjects() {
        this.#setSelectedObjects()
    }
}

//==============================================================================
