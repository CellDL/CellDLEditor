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

import type { NormalArray } from 'svg-path-commander'

//==============================================================================

import { type Point, type PointLike, PointMath } from '@renderer/common/points'
import { FixedValue, RestrictedValue } from '@editor/geometry'

import type { BoundedElement } from './boundedelement'
import { FixedPathPoint, PathElement, PathPoint } from './pathelement'

//==============================================================================

export class LinearPath extends PathElement {
    protected setPathPoints(pathArray: NormalArray) {
        if (this.validPath) {
            // set by constructor when path starts with 'M' command
            this.pathPoints.length = 0
            let pathPoint: PathPoint = new FixedPathPoint(
                new FixedValue(pathArray[0][1]),
                new FixedValue(pathArray[0][2]),
                this.firstElement
            )
            this.pathPoints.push(pathPoint)
            let n = 1
            while (n < pathArray.length) {
                const drawCommand = pathArray[n]
                if (drawCommand[0] !== 'L') {
                    this.validPath = false
                    break
                }
                const nextX = new RestrictedValue(drawCommand[1])
                const nextY = new RestrictedValue(drawCommand[2])
                if (n < pathArray.length - 1) {
                    pathPoint = new PathPoint(nextX, nextY)
                } else {
                    // End of path
                    pathPoint = new FixedPathPoint(nextX, nextY, this.lastElement)
                }
                // line from lastpoint to controlpoint
                this.pathPoints.push(pathPoint)
                n += 1
            }
        }
    }

    protected movePathPoint(position: PointLike) {
        const firstElement = this.pathPoints.at(0)!.component
        const lastElement = this.pathPoints.at(-1)!.component
        this.movePoint!.move(position)
        if ([1, 2].includes(this.moveIndex)) {
            // Index is for either the first or second point after the start point, so
            // update the boundary intersection for the start point (move of second point may
            // have moved first point after start point)
            const boundaryPoint = firstElement!.boundaryIntersections(this.pathPoints[1])[0]
            if (boundaryPoint) {
                this.pathPoints[0]!.reassignPosition(boundaryPoint)
            }
        }
        if ([2, 3].includes(this.pathPoints.length - this.moveIndex)) {
            // Index is for either the first or second point before the last point, so
            // update the boundary intersection for the last point (move of second point may
            // have moved first point before last point)
            const boundaryPoint = lastElement!.boundaryIntersections(this.pathPoints[this.pathPoints.length - 2])[0]
            if (boundaryPoint) {
                this.pathPoints.at(-1)!.reassignPosition(boundaryPoint)
            }
        }
    }

    protected movedComponentBoundingBox(index: number, component: BoundedElement, _centroidDelta: Point) {
        const position = component.centroid

        const pathPoint = this.pathPoints.at(index)!
        const prevPoint = index > 0 ? this.pathPoints[index - 1] : null
        const nextPoint = index < this.pathPoints.length - 1 ? this.pathPoints[index + 1] : null
        if (prevPoint) {
            if (index > 1) {
                const component = this.pathPoints.at(index - 2)!.component
                if (component) {
                    const boundaryPoint = component.boundaryIntersections(prevPoint)[0]
                    if (boundaryPoint) {
                        this.pathPoints.at(index - 2)!.reassignPosition(boundaryPoint)
                    }
                }
            }
            if (prevPoint.component && !prevPoint.isConduit) {
                const boundaryPoint = prevPoint.component.boundaryIntersections(pathPoint)[0]
                if (boundaryPoint) {
                    prevPoint.reassignPosition(boundaryPoint)
                }
            }
        }
        if (nextPoint) {
            if (index < this.pathPoints.length - 2) {
                const component = this.pathPoints.at(index + 2)!.component
                if (component) {
                    const boundaryPoint = component.boundaryIntersections(nextPoint)[0]
                    if (boundaryPoint) {
                        this.pathPoints.at(index + 2)!.reassignPosition(boundaryPoint)
                    }
                }
            }
            if (nextPoint.component && !nextPoint.isConduit) {
                const boundaryPoint = nextPoint.component.boundaryIntersections(pathPoint)[0]
                if (boundaryPoint) {
                    nextPoint.reassignPosition(boundaryPoint)
                }
            }
        }
        pathPoint.reassignPosition(position)

        // One and only one of prev/next point will be defined
        const boundaryPoint = prevPoint
            ? pathPoint.component!.boundaryIntersections(prevPoint)[0]
            : nextPoint
              ? pathPoint.component!.boundaryIntersections(nextPoint)[0]
              : null
        if (boundaryPoint) {
            pathPoint.reassignPosition(boundaryPoint)
        }
    }

    protected resizedComponentBoundingBox(index: number, component: BoundedElement, _cornerDeltas: [Point, Point]) {
        this.movedComponentBoundingBox(index, component, _cornerDeltas[0])
    }

    protected simplifyPathPoints(): PathPoint[] | null {
        // If two points coincide then remove one...
        const nPoints = this.pathPoints.length
        if (nPoints < 3) {
            return null
        }
        const newPoints: PathPoint[] = []
        newPoints.push(this.pathPoints[0]!)
        let index = 1
        while (index < nPoints - 1) {
            const prevPoint = this.pathPoints[index - 1]!
            const pathPoint = this.pathPoints[index]!
            const nextPoint = this.pathPoints[index + 1]!

            if (pathPoint.isConduit) {
                newPoints.push(pathPoint)
            } else if (pathPoint.point.equals(nextPoint.point)) {
                // Two identical points -- remove first one
                pathPoint.removeSvgElement()
            } else if (PointMath.colinear(prevPoint, pathPoint, nextPoint)) {
                // Three colinear points -- remove middle one
                pathPoint.removeSvgElement()
            } else {
                newPoints.push(pathPoint)
            }
            index += 1
        }
        // Add last point
        newPoints.push(this.pathPoints[nPoints - 1]!)
        if (newPoints.length === nPoints) {
            return null
        }
        return newPoints
    }
}

//==============================================================================
