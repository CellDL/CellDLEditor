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

import type { CellDLDiagram } from '@editor/diagram/index'
import type { CellDLObject } from '@editor/celldlObjects/index'
import { Point, type PointLike } from '@renderer/common/points'
import type { Statement } from '@renderer/metadata/index'

import { notifyChanges } from './index'

//==============================================================================

enum Action {
    DELETE = 1,
    INSERT = 2,
    MOVE = 3
}

//==============================================================================

enum MovePosition {
    LAST = 1,
    CURRENT = 2
}

//==============================================================================

class MoveDetails {
    controlIndex: number = 0
    currentPosition: Point | null = null
    lastPosition: Point | null = null
}

//==============================================================================

export type UndoMovePosition = [number, Point | null] | null

//==============================================================================

class ObjectDetails {
    #svgElement: SVGGraphicsElement | null = null
    #object: CellDLObject
    #parentId: string = ''
    #priorSiblingId: string = ''

    constructor(object: CellDLObject) {
        this.#object = object
        this.#svgElement = object.svgElement
        if (this.#svgElement) {
            this.#parentId = this.#svgElement.parentElement?.id || ''
            this.#priorSiblingId = this.#svgElement.previousElementSibling?.id || ''
        }
    }

    get object() {
        return this.#object
    }

    insertSvg(svgDiagram: SVGSVGElement) {
        if (this.#svgElement) {
            const parent = this.#parentId ? svgDiagram.getElementById(this.#parentId) : null
            const priorSibling = this.#priorSiblingId ? svgDiagram.getElementById(this.#priorSiblingId) : null
            if (priorSibling) {
                priorSibling.insertAdjacentElement('afterend', this.#svgElement)
            } else if (parent) {
                parent.prepend(this.#svgElement)
            }
        }
    }
}

//==============================================================================

export class EditorUndoAction {
    #knowledge: Statement[] = []
    #moveDetails: MoveDetails = new MoveDetails()
    #objectDetails: ObjectDetails[] = []

    constructor(
        readonly action: Action,
        readonly position: Point | null = null
    ) {}

    get knowledge(): Statement[] {
        return this.#knowledge
    }

    get objectDetails() {
        return this.#objectDetails
    }

    addKnowledge(statements: Statement[]) {
        this.#knowledge.push(...statements)
    }

    addObjectDetails(object: CellDLObject) {
        this.#objectDetails.push(new ObjectDetails(object))
    }

    moveDetails(position: MovePosition): UndoMovePosition {
        if (this.#moveDetails) {
            return position === MovePosition.LAST
                ? [this.#moveDetails.controlIndex, this.#moveDetails.lastPosition]
                : [this.#moveDetails.controlIndex, this.#moveDetails.currentPosition]
        }
        return null
    }

    startMove(controlIndex: number, position: PointLike) {
        this.#moveDetails.controlIndex = controlIndex
        this.#moveDetails.lastPosition = Point.fromPoint(position)
    }

    endMove(controlIndex: number, position: PointLike) {
        if (controlIndex === this.#moveDetails.controlIndex) {
            this.#moveDetails.currentPosition = Point.fromPoint(position)
        } else {
            console.warn('Move has ended on a different control point...')
        }
    }
}

//==============================================================================

class UndoRedo {
    static #instance: UndoRedo | null = null

    #redoStack: EditorUndoAction[] = []
    #undoStack: EditorUndoAction[] = []

    private constructor() {
        if (UndoRedo.#instance) {
            throw new Error('Use UndoRedo.instance instead of `new`')
        }
        UndoRedo.#instance = this
    }

    static get instance() {
        return UndoRedo.#instance ?? (UndoRedo.#instance = new UndoRedo())
    }

    clean() {
        this.#redoStack = []
        this.#undoStack = []
        window.electronAPI?.sendEditorAction('CLEAN')
    }

    #clearRedoStack() {
        if (this.#redoStack.length) {
            this.#redoStack = []
            window.electronAPI?.sendEditorAction('REDONE')
        }
    }

    #popRedoStack(): EditorUndoAction | null {
        if (this.#redoStack.length) {
            const editorAction = this.#redoStack.pop()!
            if (this.#redoStack.length === 0) {
                window.electronAPI?.sendEditorAction('REDONE')
            }
            return editorAction
        }
        return null
    }

    #pushRedoStack(redoAction: EditorUndoAction) {
        this.#redoStack.push(redoAction)
        if (this.#redoStack.length === 1) {
            window.electronAPI?.sendEditorAction('REDO')
        }
    }

    #popUndoStack(): EditorUndoAction | null {
        if (this.#undoStack.length) {
            const editorAction = this.#undoStack.pop()!
            if (this.#undoStack.length === 0) {
                window.electronAPI?.sendEditorAction('CLEAN')
            }
            return editorAction
        }
        return null
    }

    #pushUndoStack(undoAction: EditorUndoAction, reDoing: boolean): EditorUndoAction {
        this.#undoStack.push(undoAction)
        if (this.#undoStack.length === 1) {
            notifyChanges()
        }
        if (!reDoing) {
            this.#clearRedoStack() // Can no longer redo once there are new items
        }
        return undoAction
    }

    #newUndoAction(action: Action, position: Point | null = null): EditorUndoAction {
        return this.#pushUndoStack(new EditorUndoAction(action, position), false)
    }

    redo(diagram: CellDLDiagram) {
        const editorAction = this.#popRedoStack()
        if (editorAction) {
            this.#pushUndoStack(editorAction, true)
            if (editorAction.action === Action.DELETE) {
                diagram.insertDeletedObject(editorAction)
            } else if (editorAction.action === Action.INSERT) {
                diagram.deleteInsertedObject(editorAction)
            } else if (editorAction.action === Action.MOVE) {
                editorAction.objectDetails[0]?.object.undoControlMove(editorAction.moveDetails(MovePosition.CURRENT))
            }
        }
    }

    undo(diagram: CellDLDiagram) {
        const editorAction = this.#popUndoStack()
        if (editorAction) {
            this.#pushRedoStack(editorAction)
            if (editorAction.action === Action.DELETE) {
                diagram.deleteInsertedObject(editorAction)
            } else if (editorAction.action === Action.INSERT) {
                diagram.insertDeletedObject(editorAction)
            } else if (editorAction.action === Action.MOVE) {
                editorAction.objectDetails[0]?.object.undoControlMove(editorAction.moveDetails(MovePosition.LAST))
            }
        }
    }

    undoDeleteAction(): EditorUndoAction {
        return this.#newUndoAction(Action.INSERT)
    }

    undoInsertAction(): EditorUndoAction {
        return this.#newUndoAction(Action.DELETE)
    }

    undoMoveAction(): EditorUndoAction {
        return this.#newUndoAction(Action.MOVE)
    }
}

//==============================================================================

export const undoRedo = UndoRedo.instance

//==============================================================================
