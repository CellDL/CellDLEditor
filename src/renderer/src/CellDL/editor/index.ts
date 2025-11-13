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

import { electronApi } from '@renderer/common/electronApi'

//==============================================================================

import '@renderer/assets/svgContent.css'

import { CellDLObject } from '@editor/celldlObjects/index'
import { PathMaker, type PathNode } from '@editor/connections/pathmaker'
import { ObjectPropertiesPanel } from '@editor/components/properties'
import { CellDLDiagram } from '@editor/diagram/index'
import { pluginComponents } from '@editor/plugins/index'
import { round } from '@editor/utils'

import { type PointLike, PointMath } from '@renderer/common/points'
import type { StringProperties } from '@renderer/common/types'

//==============================================================================

import { EditorFrame } from '@editor/editor/editorframe'
import { editGuides, EDITOR_GRID_CLASS } from '@editor/editor/editguides'
import PanZoom from '@editor/editor/panzoom'
import { SelectionBox } from '@editor/editor/selectionbox'
import { undoRedo } from '@editor/editor/undoredo'

//import { componentProperties } from '@editor/components/properties'

//==============================================================================

/****  WIP
const SVG_CLOSE_DISTANCE = 2   // Pointer is close to object in SVG coords
                               // c.f. stroke-width (for connections)??
WIP ****/

//==============================================================================

const MAX_POINTER_CLICK_TIME = 200 // milliseconds

//==============================================================================

// Lookup tables for tracking tool bar state

export enum EDITOR_TOOL_IDS {
    SelectTool = 'select-tool',
    DrawConnectionTool = 'draw-connection-tool',
    AddComponentTool = 'add-component-tool'
}

export const DEFAULT_EDITOR_TOOL_ID = EDITOR_TOOL_IDS.SelectTool

enum EDITOR_STATE {
    Selecting = 'SELECTING',
    DrawPath = 'DRAW-PATH',
    AddComponent = 'ADD-COMPONENT'
}

const TOOL_TO_STATE: Map<EDITOR_TOOL_IDS, EDITOR_STATE> = new Map([
    [EDITOR_TOOL_IDS.SelectTool, EDITOR_STATE.Selecting],
    [EDITOR_TOOL_IDS.DrawConnectionTool, EDITOR_STATE.DrawPath],
    [EDITOR_TOOL_IDS.AddComponentTool, EDITOR_STATE.AddComponent]
])

const DEFAULT_EDITOR_STATE = TOOL_TO_STATE.get(DEFAULT_EDITOR_TOOL_ID)!

const POPOVER_TO_TOOL = {
    'draw-connection-popover': 'draw-connection-tool',
    'add-component-popover': 'add-component-tool'
}

//==============================================================================

export enum PANEL_IDS {
    PropertyPanel = 'property-panel'
}

//==============================================================================

export enum CONTEXT_MENU {
    DELETE = 'menu-delete',
    EDIT_GROUP = 'menu-edit-group',
    INFO = 'menu-info',
    GROUP_OBJECTS = 'menu-group',
    UNGROUP_OBJECTS = 'menu-ungroup'
}
//==============================================================================

export function notifyChanges() {
    electronApi?.sendEditorAction('DIRTY')
}

//==============================================================================

export function getElementId(element: SVGGraphicsElement): string {
    return element.dataset.parentId
        ? element.dataset.parentId
        : element.classList.contains('parent-id')
          ? element.parentElement?.id || ''
          : element.id
}

//==============================================================================

const SVG_PANEL_ID = 'svg-panel'

export class CellDLEditor {
    static instance: CellDLEditor | null = null

    #container: HTMLElement | null = null
    /**
    #statusMsg: HTMLElement
    #statusPos: HTMLElement
    #statusStyle: string = ''
**/

    #celldlDiagram: CellDLDiagram | null = null
    #svgDiagram: SVGSVGElement | null = null
    #editorFrame: EditorFrame | null = null

    #panning: boolean = false
    #panzoom: PanZoom | null = null
    #pointerMoved: boolean = false
    #pointerPosition: DOMPoint | null = null
    #moving: boolean = false

    #editorState: EDITOR_STATE = DEFAULT_EDITOR_STATE
    #activeObject: CellDLObject | null = null
    #dirty: boolean = false

    #dragging: boolean = false
    #haveFocus: boolean = true

    #pathMaker: PathMaker | null = null
    #nextPathNode: PathNode | null = null

//    #contextMenu: ContextMenu

    #currentTemplateId: string | null = null
    #drawConnectionSettings: StringProperties = {}

    #selectedObject: CellDLObject | null = null
    #selectionBox: SelectionBox | null = null
    #newSelectionBox: boolean = false

    #pointerDownTime: number = 0

    #openPanelId: PANEL_IDS | null = null
    #propertiesPanel: ObjectPropertiesPanel = new ObjectPropertiesPanel()

    constructor() {
        CellDLEditor.instance = this
        /**
        this.#statusMsg = this.getElementById('status-msg')!
        this.#statusPos = this.getElementById('status-pos')!
        this.#contextMenu = this.getElementById('context-menu') as ContextMenu
        this.status = 'new editor'
**/
        // Add a handler for events from toolbar buttons
        document.addEventListener('toolbar-event', this.#toolBarEvent.bind(this))

        // Add handler for events from panels
        document.addEventListener('panel-event', this.#panelEvent.bind(this))
    }

    mount(svgContainer: HTMLElement) {
        this.#container = svgContainer

        // Create a panzoom handler
        this.#panzoom = new PanZoom(this.#container)

        // Set up event handlers
        this.#container.addEventListener('click', this.#pointerClickEvent.bind(this))
        this.#container.addEventListener('dblclick', this.#pointerDoubleClickEvent.bind(this))

        this.#container.addEventListener('pointerover', this.#pointerOverEvent.bind(this))
        this.#container.addEventListener('pointerout', this.#pointerOutEvent.bind(this))

        this.#container.addEventListener('pointerdown', this.#pointerDownEvent.bind(this))
        this.#container.addEventListener('pointermove', this.#pointerMoveEvent.bind(this))
        this.#container.addEventListener('pointerup', this.#pointerUpEvent.bind(this))

        // Editor content focus handlers
        document.addEventListener('focusin', this.#focusEvent.bind(this))
        document.addEventListener('focusout', this.#focusEvent.bind(this))

        // Keyboard handlers
        window.addEventListener('keydown', this.#keyDownEvent.bind(this))
        window.addEventListener('keyup', this.#keyUpEvent.bind(this))

        // Add a handler for dropping components on the canvas
        document.addEventListener('component-drag', this.#componentTemplateDragEvent.bind(this))

/**

        this.#app.addEventListener('dragover', this.#appDragOverEvent.bind(this))
        this.#app.addEventListener('drop', this.#appDropEvent.bind(this))

        // Handle context menu events
        this.#container.addEventListener('contextmenu', (event) => {
            const element = event.target as SVGGraphicsElement
            const clickedObject = this.#celldlDiagram!.objectById(getElementId(element))
            if (clickedObject && clickedObject === this.#activeObject) {
                this.#setSelectedObject(clickedObject)
            }
            this.#contextMenu.open(event.clientX, event.clientY)
        })

        this.#contextMenu.setListener((event: Event) => {
            const targetId = 'target' in event && event.target && 'id' in event.target ? event.target.id : null
            if (targetId === CONTEXT_MENU.DELETE) {
                this.#deleteSelectedObjects()
            } else if (targetId === CONTEXT_MENU.INFO) {
                this.#showSelectedObjectInfo()
            } else if (targetId === CONTEXT_MENU.GROUP_OBJECTS) {
                if (this.#selectionBox) {
                    this.#selectionBox.makeCompartment()
                    this.#closeSelectionBox()
                }
            }
            this.#contextMenu.close()
        })

        // Create a tooltip
        this.#currentTooltip = document.createElement('x-tooltip') as XTooltipElement
        this.#container.append(this.#currentTooltip)
**/
    }

    get celldlDiagram() {
        return this.#celldlDiagram
    }

    get dirty() {
        return this.#dirty
    }

    get editorFrame() {
        return this.#editorFrame
    }

/**
    get status(): string {
        return this.#statusMsg.innerText || ''
    }
    set status(text: string) {
        this.showMessage(text)
    }
**/

    get windowSize(): [number, number] {
        if (this.#container) {
            return [this.#container.clientWidth, this.#container.clientHeight]
        }
        return [0, 0]
    }

    setDirty() {
        if (!this.#dirty) {
            this.#dirty = true
        }
    }

    markClean() {
        if (this.#dirty) {
            this.#dirty = false
        }
    }

    editDiagram(celldlDiagram: CellDLDiagram) {
        if (this.#celldlDiagram !== null) {
            this.closeDiagram()
        }
        this.#celldlDiagram = celldlDiagram
        this.#svgDiagram = celldlDiagram.svgDiagram

        // Make sure we have a group in which to put selection related objects
        // This MUST remain as the last group in the diagram when new layer groups are added...
        this.#editorFrame = new EditorFrame(this.#svgDiagram!)

        // Note the selection group's element so that it's not saved
        celldlDiagram.addEditorElement(this.#editorFrame.svgGroup!)
        // Initialise alignment guides and grid
        editGuides.newDiagram(celldlDiagram, true)

        // Show the diagram in the editor's window
        if (this.#container) {
            this.#container.appendChild(this.#svgDiagram!)
        }

        // Rewriting metadata during diagram finishSetup might dirty
        this.markClean()
        undoRedo.clean()

        // Finish setting up the diagram as we now have SVG elements
        celldlDiagram.finishSetup()

        // Enable pan/zoom and toolBars
        this.#panzoom!.enable(this.#svgDiagram!)

        // Set initial state
        this.#editorState = EDITOR_STATE.Selecting
        this.#activeObject = null
        this.#pointerMoved = false
        this.#selectedObject = null

        // We are good to go
//        this.status = 'Editor ready...'
    }

    closeDiagram() {
        if (this.#celldlDiagram !== null) {
            this.#editorFrame!.clear()
            this.#editorFrame = null
            //            this.#toolBar.enable(false)
            this.#panzoom!.disable()
            if (this.#container) {
                this.#container.removeChild(this.#svgDiagram as Node)
            }
            this.#svgDiagram = null
            this.#celldlDiagram = null
        }
    }

    resetObjectStates() {
        this.#unsetSelectedObject()
        this.#unsetActiveObject()
    }

    #setDefaultCursor() {
        if (this.#editorState === EDITOR_STATE.DrawPath) {
            this.#svgDiagram?.style.setProperty('cursor', 'crosshair')
        } else {
            this.#svgDiagram?.style.removeProperty('cursor')
        }
        if (this.#container) {
            this.#container.style.setProperty('cursor', 'default')
        }
    }

    enableContextMenuItem(itemId: string, enable: boolean = true) {
//        this.#contextMenu.enableItem(itemId, enable)
    }

    #toolBarEvent(event: Event) {
        const detail = (<CustomEvent>event).detail

        if (detail.type === 'state') {
            if (Object.values(PANEL_IDS).includes(detail.tool)) {
                this.#openPanelId = detail.value ? detail.tool : null
            }
            else if (detail.value && TOOL_TO_STATE.has(detail.tool as EDITOR_TOOL_IDS)) {
                this.#editorState = TOOL_TO_STATE.get(detail.tool as EDITOR_TOOL_IDS)!
                this.#setDefaultCursor()
                if (this.#editorState !== EDITOR_STATE.Selecting) {
                    this.#unsetSelectedObject()
                    this.#closeSelectionBox()
                }
                if (this.#editorState !== EDITOR_STATE.DrawPath) {
                    // Remove any partial path from editor frame...
                    if (this.#pathMaker) {
                        this.#pathMaker.close()
                        this.#pathMaker = null
                    }
                }
            }
        } else if (detail.type === 'value') {
            if (detail.source === EDITOR_TOOL_IDS.DrawConnectionTool) {
                this.#drawConnectionSettings = {
                    style: detail.value
                }
            } else if (detail.source === EDITOR_TOOL_IDS.AddComponentTool) {
                this.#currentTemplateId = detail.value
            }
        }
    }

    #panelEvent(event: Event) {
        const detail = (<CustomEvent>event).detail
        if (detail.panel === this.#openPanelId) {
            if (this.#openPanelId === PANEL_IDS.PropertyPanel) {
                this.#propertiesPanel.updateObject(this.#selectedObject)
            }
        }
    }

    showMessage(msg: string, style: string = '') {
/**
        this.#statusMsg.innerText = msg
        if (this.#statusStyle !== '') {
            this.#statusMsg.classList.remove(this.#statusStyle)
        }
        if (style !== '') {
            this.#statusMsg.classList.add(style)
            this.#statusStyle = style
        }
**/
    }

    showTooltip(msg: string, style: string = '') {
        if (this.#pointerPosition) {
            this.#showTooltip(this.#pointerPosition, msg, ['warn', 'error'].includes(style) ? 'error' : 'hint')
        }
    }

    #showPos(pos: PointLike) {
//        this.#statusPos.innerText = `(${round(pos.x, 1)}, ${round(pos.y, 1)})`
    }

    #showTooltip(context: DOMPoint | DOMRect | Element, content: string, type: string = 'hint') {
/**
        if (this.#currentTooltip && content.trim() !== '') {
            this.#currentTooltip.innerHTML = `<x-message>${content}</x-message>`
            this.#currentTooltip.type = type
            setTimeout(() => {
                this.#currentTooltip!.open(context, false)
            }, 1)
        }
**/
    }

    #closeTooltip() {
//        if (this.#currentTooltip) {
//            this.#currentTooltip.close(false)
//        }
    }

    #domToSvgCoords(domCoords: PointLike): DOMPoint {
        return this.#celldlDiagram!.domToSvgCoords(domCoords)
    }

    #highlightAssociatedObjects(object: CellDLObject, highlight: boolean) {
        for (const obj of this.#celldlDiagram!.associatedObjects(object)) {
            obj.highlight(highlight)
        }
    }

    #activateObject(object: CellDLObject, active: boolean) {
        object.activate(active)
        if (object.isConnection) {
            this.#highlightAssociatedObjects(object, active)
        }
        if (object.selected) {
            this.#editorFrame!.highlight(active)
        }
    }

    #setActiveObject(activeObject: CellDLObject | null) {
        if (activeObject && this.#activeObject !== activeObject) {
            activeObject.drawControlHandles()
            this.#activateObject(activeObject, true)
            this.#activeObject = activeObject
        }
    }

    #unsetActiveObject() {
        if (this.#activeObject) {
            this.#activeObject.clearControlHandles()
            this.#activateObject(this.#activeObject, false)
            this.#activeObject = null
        }
    }

    #setSelectedObject(selectedObject: CellDLObject) {
        this.#unsetSelectedObject() // This will depend upon multi-selection
        if (selectedObject !== null) {
            selectedObject.select(true)
            this.#selectedObject = selectedObject
            this.#propertiesPanel.setCurrentObject(selectedObject)
            this.enableContextMenuItem(CONTEXT_MENU.DELETE, true)
            this.enableContextMenuItem(CONTEXT_MENU.INFO, true)
        }
    }

    #unsetSelectedObject() {
        if (this.#selectedObject) {
            this.#selectedObject.select(false)
            this.#selectedObject = null
            this.#propertiesPanel.setCurrentObject(null)
            this.enableContextMenuItem(CONTEXT_MENU.DELETE, false)
            this.enableContextMenuItem(CONTEXT_MENU.INFO, false)
        }
    }

    #componentTemplateDragEvent(_event: Event) {
        this.#dragging = true
    }

    #appDragOverEvent(event: DragEvent) {
        if (this.#dragging && event.dataTransfer) {
            event.preventDefault() // Needed to allow drop
            event.dataTransfer.dropEffect = 'copy'
        }
    }

    #addComponentTemplate(eventPosition: PointLike, templateId: string) {
        const zoomScale = this.#panzoom?.scale || 1
        const topLeft = eventPosition // PointMath.subtract(eventPosition, PointMath.scalarScale(event.centre, zoomScale))

        const template = {...pluginComponents.getComponentTemplate(templateId)}
        if (template === null) {
            console.error(`Drop of unknown component template '${templateId}'`)
            return
        }
        const componentGroup = this.#editorFrame!.addSvgElement(template, this.#domToSvgCoords(topLeft))
        const celldlObject = this.#celldlDiagram!.addConnectedObject(componentGroup, template)
        if (celldlObject) {
            this.#setSelectedObject(celldlObject)
        }
    }

    #appDropEvent(event: DragEvent) {
        this.#dragging = false
        if (event.dataTransfer) {
            this.#addComponentTemplate(event, JSON.parse(event.dataTransfer.getData('component-detail')))
        }
    }

    // Should we be calling event.preventDefault() ????

    #pointerClickEvent(event: MouseEvent) {
        const element = event.target as SVGGraphicsElement
        if (
            this.#celldlDiagram === null ||
            !this.#svgDiagram?.contains(element) ||
            // clickTolerance = 1px ? to set pointerMoved?
            (this.#pointerMoved && Date.now() - this.#pointerDownTime > MAX_POINTER_CLICK_TIME)
        ) {
            return
        }
        const clickedObject = this.#celldlDiagram.objectById(getElementId(element))
        if (this.#editorState === EDITOR_STATE.AddComponent && clickedObject === null) {
            if (this.#currentTemplateId) {
                this.#addComponentTemplate(event, this.#currentTemplateId)
            }
            return
        }
        let deselected = false
        if (this.#selectedObject !== null) {
            if (this.#editorFrame!.contains(element)) {
                // Send click on a selected object's frame to the object
                return
            } else {
                // Deselect
                deselected = clickedObject === this.#selectedObject
                this.#unsetSelectedObject()
            }
        }
        if (this.#editorState === EDITOR_STATE.DrawPath) {
            if (this.#pathMaker) {
                if (this.#activeObject === null) {
                    const svgPoint = this.#domToSvgCoords(event)
                    this.#pathMaker.addPoint(svgPoint, event.shiftKey)
                }
            }
        } else {
            if (!deselected && clickedObject && clickedObject === this.#activeObject) {
                // Select when active object is clicked
                this.#setSelectedObject(clickedObject)
            }
        }
    }

    #pointerDoubleClickEvent(event: MouseEvent) {
        if (this.#editorState === EDITOR_STATE.DrawPath) {
            if (this.#pathMaker) {
                if (this.#activeObject === null) {
                    this.#pathMaker.finishPartialPath(this.#celldlDiagram!, event.shiftKey)
                    this.#pathMaker = null
                }
            } else {
                this.#nextPathNode = PathMaker.startPartialPath(this.#domToSvgCoords(event), this.#celldlDiagram!)
                if (this.#nextPathNode != null) {
                    const settings = this.#drawConnectionSettings // settings.type is to come from object's domain...
                    this.#pathMaker = new PathMaker(this.#editorFrame!, this.#nextPathNode, settings.style)
                }
            }
        }
    }

    #notDiagramElement(element: SVGGraphicsElement) {
        return (
            element === this.#svgDiagram ||
            element.id === SVG_PANEL_ID ||
            element.classList.contains(EDITOR_GRID_CLASS) ||
            !this.#svgDiagram?.contains(element)
        )
    }

    #pointerOverEvent(event: PointerEvent) {
        if (this.#celldlDiagram === null) {
            return
        }
        const element = event.target as SVGGraphicsElement
        const currentObject = this.#celldlDiagram.objectById(getElementId(element))

        if (this.#moving) {
            // A move finishes with pointer up
            return
        } else if (this.#notDiagramElement(element)) {
//            this.status = ''
            this.#closeTooltip()
            if (this.#activeObject && currentObject !== this.#activeObject) {
                this.#unsetActiveObject()
            }
            return
        } else if (this.#selectionBox && this.#selectionBox.pointerEvent(event, this.#domToSvgCoords(event))) {
            return
        }

        if (currentObject) {
//            this.status = `${currentObject.template.name} ${currentObject.id}`
        }

        if (this.#editorState === EDITOR_STATE.DrawPath) {
            if (
                this.#activeObject &&
                currentObject !== this.#activeObject &&
                (currentObject !== null || (this.#pathMaker && element !== this.#pathMaker.currentSvgPath))
            ) {
                this.#unsetActiveObject()
            }
            if (currentObject) {
                element.style.removeProperty('cursor')
                if (this.#pathMaker === null) {
                    this.#nextPathNode = PathMaker.validStartObject(currentObject)
                } else {
                    this.#nextPathNode = this.#pathMaker.validPathNode(currentObject)
                }
                if (this.#nextPathNode) {
                    this.#setActiveObject(currentObject)
                }
            }
        } else {
            if (this.#activeObject && currentObject !== this.#activeObject) {
                this.#unsetActiveObject()
            }
            if (currentObject) {
                this.#setActiveObject(currentObject)
                currentObject.initialiseMove(element)
            }
        }
    }

    #pointerOutEvent(event: PointerEvent) {
        const element = event.target as SVGGraphicsElement
        if (
            element === this.#svgDiagram ||
            element.classList.contains(EDITOR_GRID_CLASS) ||
            !this.#svgDiagram?.contains(element)
        ) {
            if (this.#activeObject && !this.#moving) {
                this.#activeObject.finaliseMove()
                this.#unsetActiveObject()
            }
        } else if (this.#editorState === EDITOR_STATE.DrawPath) {
            if (this.#pathMaker === null) {
                this.#unsetActiveObject()
            }
        }
    }

    #pointerDownEvent(event: PointerEvent) {
        this.#pointerMoved = false
        this.#pointerDownTime = Date.now()
        const element = event.target as SVGGraphicsElement
        if (event.button === 2 || (!event.shiftKey && this.#notDiagramElement(element))) {
            this.#svgDiagram?.style.removeProperty('cursor')
            this.#container?.style.setProperty('cursor', 'grab')
            this.#panzoom!.pointerDown(event)
            this.#panning = true
            return
        }
        const svgPoint = this.#domToSvgCoords(event)
        if (this.#editorState === EDITOR_STATE.DrawPath) {
            if (this.#activeObject && this.#nextPathNode) {
                if (this.#pathMaker === null) {
                    const settings = this.#drawConnectionSettings // settings.type is to come from object's domain...
                    this.#pathMaker = new PathMaker(this.#editorFrame!, this.#nextPathNode, settings.style)
                } else if (!this.#pathMaker.empty) {
                    if (this.#activeObject.isConduit) {
                        this.#pathMaker.addIntermediate(this.#nextPathNode, event.shiftKey)
                    } else {
                        this.#pathMaker.finishPath(this.#nextPathNode, this.#celldlDiagram!, event.shiftKey)
                        this.#pathMaker = null
                    }
                }
            }
        } else if (this.#activeObject !== null && this.#activeObject.moveable) {
            // EDITOR_STATE.Selecting or EDITOR_STATE.AddComponent
            this.#activeObject.startMove(svgPoint)
            this.#moving = true
        } else if (this.#editorState === EDITOR_STATE.Selecting) {
            if (this.#selectionBox) {
                this.#selectionBox.pointerEvent(event, svgPoint)
            } else if (event.shiftKey) {
                this.#unsetSelectedObject()
                this.#selectionBox = new SelectionBox(this, svgPoint)
                this.#newSelectionBox = true
            }
        }
    }

    #pointerMoveEvent(event: PointerEvent) {
        if (this.#panning) {
            this.#pointerMoved = this.#panzoom!.pointerMove(event) || this.#pointerMoved
            return
        }
        this.#pointerMoved = true
        this.#pointerPosition = new DOMPoint(event.x, event.y)
        const svgPoint = this.#domToSvgCoords(event)
        this.#showPos(svgPoint)
        if (this.#editorState === EDITOR_STATE.DrawPath) {
            if (this.#pathMaker) {
                this.#pathMaker.drawTo(svgPoint, event.shiftKey)
            }
        } else if (this.#activeObject && this.#moving) {
            // EDITOR_STATE.Selecting or EDITOR_STATE.AddComponent
            this.#activeObject!.move(svgPoint)
            this.#celldlDiagram!.objectMoved(this.#activeObject!)
            if (this.#selectionBox) {
                this.#selectionBox.updateSelectedObjects()
            }
        } else if (this.#editorState === EDITOR_STATE.Selecting) {
            if (this.#selectionBox) {
                this.#selectionBox.pointerEvent(event, svgPoint)
            }
        }
    }

    #pointerUpEvent(event: PointerEvent) {
        if (this.#celldlDiagram === null) {
            return
        }
        const domPoint = this.#domToSvgCoords(event)
        if (this.#panning) {
            this.#panzoom!.pointerUp(event)
            this.#panning = false
            this.#setDefaultCursor()
            if (
                !this.#pointerMoved &&
                !this.#newSelectionBox &&
//                !this.#contextMenu.isOpen &&
                this.#selectionBox &&
                !this.#selectionBox.pointInside(domPoint)
            ) {
                this.#closeSelectionBox()
            }
            return
        }
        const element = event.target as SVGGraphicsElement
        const currentObject = this.#celldlDiagram.objectById(getElementId(element))

        if (this.#editorState !== EDITOR_STATE.DrawPath) {
            if (this.#activeObject && this.#moving) {
                this.#activeObject!.endMove()
                this.#moving = false
                if (currentObject !== this.#activeObject) {
                    this.#activeObject!.finaliseMove()
                    if (this.#activeObject === this.#selectedObject) {
                        this.#unsetSelectedObject()
                    }
                    this.#unsetActiveObject()
                }
            } else if (this.#editorState === EDITOR_STATE.Selecting) {
                if (this.#selectionBox && !this.#selectionBox.pointerEvent(event, domPoint)) {
                    this.#closeSelectionBox()
                }
                this.#newSelectionBox = false
            }
        }
    }

    #closeSelectionBox() {
        if (this.#selectionBox) {
            this.#selectionBox.close()
            this.#selectionBox = null
        }
    }

    #deleteSelectedObjects() {
        if (this.#selectedObject) {
            // Delete the object
            this.#unsetActiveObject()
            this.#celldlDiagram!.removeObject(this.#selectedObject)
            this.#unsetSelectedObject()
        } else if (this.#selectionBox) {
            for (const object of this.#selectionBox.selectedObjects) {
                this.#celldlDiagram!.removeObject(object)
            }
            this.#selectionBox.close()
            this.#selectionBox = null
        }
    }

    #focusEvent(event: FocusEvent) {
        // Detect when no input fields have focus
        this.#haveFocus = event.type === 'focusout'
    }

    #keyDownEvent(event: KeyboardEvent) {
        if (this.#haveFocus && event.key === 'Backspace') {
            this.#deleteSelectedObjects()
        } else if (this.#editorState === EDITOR_STATE.DrawPath && event.key === 'Escape') {
            if (this.#pathMaker) {
                // Remove any partial path
                this.#pathMaker.close()
                this.#pathMaker = null
            }
        }
    }

    #keyUpEvent(event: KeyboardEvent) {
        if (event.key === 'Shift') {
            this.#setDefaultCursor()
        }
    }

    #showSelectedObjectInfo() {
        if (this.#selectedObject) {
            //console.log('INFO:', this.#selectedObject.asString())
        }
    }
}

//==============================================================================
//==============================================================================
