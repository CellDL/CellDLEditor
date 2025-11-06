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

import Flatbush from 'flatbush'
import RBush from 'rbush'

//==============================================================================

import type { CellDLObject } from '@editor/celldlObjects'

import type { Bounds } from '.'

//==============================================================================

export type ContainedObject = {
    object: CellDLObject
    exact: boolean
}

//==============================================================================

class IdBounds {
    id: string
    bounds: Bounds

    constructor(celldlObject: CellDLObject) {
        this.bounds = celldlObject.celldlSvgElement!.svgBounds()
        this.id = celldlObject.id
    }
}

//==============================================================================

class ExtendableSpatialIndex extends RBush<IdBounds> {
    toBBox(item: IdBounds) {
        return {
            minX: item.bounds.left,
            minY: item.bounds.top,
            maxX: item.bounds.right,
            maxY: item.bounds.bottom
        }
    }

    compareMinX(a: IdBounds, b: IdBounds): number {
        return a.bounds.left - b.bounds.left
    }

    compareMinY(a: IdBounds, b: IdBounds): number {
        return a.bounds.top - b.bounds.top
    }

    remove(item: IdBounds) {
        return super.remove(item, (a, b) => a.id === b.id)
    }
}

//==============================================================================

export class CellDLSpatialIndex {
    #index: ExtendableSpatialIndex = new ExtendableSpatialIndex()
    #objects: Map<string, [CellDLObject, IdBounds]> = new Map()

    add(celldlObject: CellDLObject) {
        // An object, declared in metadata, might not have a corresponding SVG element...
        if (celldlObject.celldlSvgElement) {
            const item = new IdBounds(celldlObject)
            this.#index.insert(item)
            this.#objects.set(celldlObject.id, [celldlObject, item])
        }
    }

    remove(celldlObject: CellDLObject) {
        if (this.#objects.has(celldlObject.id)) {
            this.#index.remove(this.#objects.get(celldlObject.id)![1])
            this.#objects.delete(celldlObject.id)
        }
    }

    update(celldlObject: CellDLObject) {
        if (this.#objects.has(celldlObject.id)) {
            const savedItem = this.#objects.get(celldlObject.id)![1]
            const item = new IdBounds(celldlObject)
            if (!savedItem.bounds.equal(item.bounds)) {
                this.#index.remove(savedItem)
                this.#index.insert(item)
                this.#objects.get(celldlObject.id)![1] = item
            }
        }
    }

    objectsContainedIn(bounds: Bounds): ContainedObject[] {
        const intersectingItems = this.#index.search({
            minX: bounds.left,
            minY: bounds.top,
            maxX: bounds.right,
            maxY: bounds.bottom
        })
        return intersectingItems.map((item) => {
            return {
                object: this.#objects.get(item.id)![0],
                exact: item.bounds.inContainer(bounds)
            }
        })
    }
}

//==============================================================================

export type SpatialSearchResult = {
    object: CellDLObject
    bounds: Bounds
}

//==============================================================================

export class SpatialObjectIndex {
    #spatialBounds: Map<number, Bounds> = new Map()
    #spatialObjects: Map<number, CellDLObject> = new Map()
    #spatialObjectIndex: Flatbush | null = null

    constructor(celldlObjects: CellDLObject[]) {
        if (celldlObjects.length) {
            this.#spatialObjectIndex = new Flatbush(celldlObjects.length)
            for (const object of celldlObjects) {
                const bounds = object.celldlSvgElement!.svgBounds()
                const index = this.#spatialObjectIndex.add(...bounds.asArray())
                this.#spatialBounds.set(index, bounds)
                this.#spatialObjects.set(index, object)
            }
            this.#spatialObjectIndex.finish()
        }
    }

    search(bounds: Bounds): SpatialSearchResult[] {
        return this.#spatialObjectIndex
            ? this.#spatialObjectIndex.search(...bounds.asArray()).map((index) => {
                  return {
                      object: this.#spatialObjects.get(index)!,
                      bounds: this.#spatialBounds.get(index)!
                  }
              })
            : []
    }
}

//==============================================================================
