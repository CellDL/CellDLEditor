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

import { CONNECTION_SPLAY_PADDING } from '@renderer/common/styling'
import { Point, type PointLike, PointMath } from '@renderer/common/points'
import { editGuides } from '@editor/editor/editguides'

import { FixedValue, RestrictedValue } from '@editor/geometry/index'
import { roundEqual } from '@editor/utils'

import type { BoundedElement } from './boundedelement'
import { FixedPathPoint, PathElement, PathPoint } from './pathelement'

//==============================================================================

/**

 1) Paths can be described by their edges, with ``S`` being an edge from a
    component's boundary to its splay point, ``H`` a horizontal path, and ``V``
    a vertical path.
 2) Paths always start and end with ``S`` edges; between these two edges there
    is at least a one long sequence of ``H`` and ``V`` edges, with ``H`` and ``V``
    alternating along the path.
 3) Path splitting is always in an edge connected to an ``S`` edge.
 4) There can only be at most two paths split during a CP move -- ``S V H S``
    and its dual.
 5) Path simplification is a process of edge renewal and joining, and happens at
    the end of a move, immediately before the SVG <path> is set.
 6) Only ``H`` and ``V`` edges can be removed.
 6) An edge is removed if it has zero length; one end of this edge will be the node
    used for the move operation.
 7) If the removed edge was connected to an ``S`` edge, simplification stops
    with edge removal.
 8) Otherwise the two adjacent ``H`` or ``V`` edges of the removed edge are
    combined and simplification stops.
 9) CPs and their svgElements have an ``active`` state, used to set removed CPs to
    inactive during path simplification, when CPs are reassigned if there are now
    inactive ones.
10) If a ``H`` or ``V`` edge connected to the moving node has a length close to
    zero then the node's position snaps to the point at which the edge's length
    is zero.

 1) The node positions at each end of an edge are ``RestrictedPoints``
 2) An ``H`` edge has identical ``Y`` values of its nodes; if one node is connected
    to an ``S`` edge then this node determines the other's ``Y`` value; ``S H S`` is
    a special case.
 3) An ``V`` edge has identical ``X`` values of its nodes; if one node is connected
    to an ``S`` edge then this node determines the other's ``X`` value; ``S V S`` is
    a special case.
 4) The positions of an ``S`` edge's nodes are determined by the intersection of the
    line, from the outermost node to the centroid of the associated component, with
    the component's boundary and its outer padded boundary.
**/

//==============================================================================

type EdgeDirection = 'H' | 'S' | 'V'

function direction(p0: PointLike, p1: PointLike): EdgeDirection {
    return Math.abs(p0.x - p1.x) > Math.abs(p0.y - p1.y) ? 'H' : 'V'
}

//==============================================================================

class PathEdge {
    #direction: EdgeDirection
    #pathPoints: [PathPoint, PathPoint]

    constructor(pathPoints: [PathPoint, PathPoint], terminator: boolean = false) {
        this.#pathPoints = pathPoints
        this.#direction = terminator ? 'S' : direction(...pathPoints)
    }

    get pathPoints() {
        return this.#pathPoints
    }

    get direction() {
        return this.#direction
    }

    get length(): number {
        return PointMath.distance(this.#pathPoints[0], this.#pathPoints[1])
    }

    combine(other: PathEdge): PathEdge | null {
        if (this.#direction === other.#direction && this.#direction !== 'S') {
            const cp0 = this.#pathPoints[0]
            const cp1 = other.#pathPoints[1]
            // don't blend Y nor X if both edges abut an S edge...
            // (pre-terminator??)
            if (this.#direction === 'H') {
                if (cp0.static && cp1.static) {
                    // Don't copy values
                } else if (cp1.static) {
                    cp0.yValue = cp1.yValue
                } else {
                    cp1.yValue = cp0.yValue
                }
            } else {
                if (cp0.static && cp1.static) {
                    // Don't copy values
                } else if (cp1.static) {
                    cp0.xValue = cp1.xValue
                } else {
                    cp1.xValue = cp0.xValue
                }
            }
            const r = new PathEdge([cp0, cp1])
            return r
        }
        return null
    }

    toString(): string {
        return `Edge: ${this.#direction}, ${this.length} [${this.#pathPoints[0].toString()}, ${this.#pathPoints[1].toString()}]`
    }
}

//==============================================================================

function getEdges(pathPoints: PathPoint[]) {
    return pathPoints
        .slice(0, -1)
        .map((cp, i) => new PathEdge([cp, pathPoints[i + 1]!], i === 0 || i === pathPoints.length - 2))
}

/** DEBUGGING

function edgesSignature(path: PathEdge[]): string
//===============================================
{
    return `"${path.map(e => e.direction).join(' ')}": ${path.map(e => e.length)}`
}

function pathSignature(pathPoints: PathPoint[]): string
//=====================================================
{
    return edgesSignature(getEdges(pathPoints))
}

function checkEdges(pathPoints: PathPoint[], id:string='', all:boolean=false)
//===========================================================================
{
    const edges = getEdges(pathPoints)
    let goodEdges = (edges.length >= 3
        && edges[0].direction === 'S'
        && edges[1].direction !== 'S'
        && edges[edges.length-1].direction === 'S')
    if (goodEdges) {
        let dirn = edges[1].direction
        for (const edge of edges.slice(2, -1)) {
            if (edge.direction === 'S' || edge.direction === dirn) {
                goodEdges = false
                break
            }
            dirn = edge.direction
        }
    }
    if (all || !goodEdges) {
        console.log(`${!goodEdges ? 'Bad edges' : 'Edges'}...`, id, edgesSignature(edges))
    }
}
DEBUGGING **/

//==============================================================================

export class RectilinearPath extends PathElement {
    protected pathFromPathPoints(): NormalArray {
        const points = this.pathPoints
        const nPoints = points.length
        const firstIndex = PointMath.colinear(points[0]!, points[1]!, points[2]!, true) ? 2 : 1
        const lastIndex = PointMath.colinear(points[nPoints - 3]!, points[nPoints - 2]!, points[nPoints - 1]!, true)
            ? -2
            : -1
        const path: PathPoint[] = [points[0]!, ...points.slice(firstIndex, lastIndex)!, points[nPoints - 1]!]
        const pathArray = path.map(p => ['L', p.x, p.y])
        pathArray[0]![0] = 'M'
        return pathArray as NormalArray
    }

    static #elementPathPoints(element: BoundedElement, pathPoint: Point): [PathPoint, PathPoint] {
        const paddedBoundaryPoint = element.boundaryNormalIntersection(pathPoint)
        const intersections = element.boundaryIntersections(paddedBoundaryPoint)
        const boundaryPoint = new FixedPathPoint(
            new FixedValue(intersections[0]!.x),
            new FixedValue(intersections[0]!.y),
            element
        )
        const splayPoint = new PathPoint(
            new RestrictedValue(intersections[1]!.x, ...element.xBounds(CONNECTION_SPLAY_PADDING)),
            new RestrictedValue(intersections[1]!.y, ...element.yBounds(CONNECTION_SPLAY_PADDING))
        )
        splayPoint.setStatic()
        return [boundaryPoint, splayPoint]
    }

    protected setPathPoints(pathArray: NormalArray) {
        this.pathPoints.length = 0
        if (this.validPath) {
            // `validPath` is set by the constructor when path starts
            const pathLength = pathArray.length // with 'M' command and is at least 2 long
            let pathIndex = 1
            let currentPathPoint = new Point(pathArray[1][1], pathArray[1][2])
            const firstPathPoints = RectilinearPath.#elementPathPoints(this.firstElement, currentPathPoint)
            this.pathPoints.push(...firstPathPoints)
            let prevPathPoint = this.pathPoints[1]!
            if (!this.firstElement.pointOutside(currentPathPoint, CONNECTION_SPLAY_PADDING)) {
                pathIndex = 2
                currentPathPoint = new Point(pathArray[2][1], pathArray[2][2])
            }
            while (pathIndex < pathLength - 2) {
                const dirn = direction(prevPathPoint, currentPathPoint)
                const pathPoint = new PathPoint(
                    dirn === 'H' ? new RestrictedValue(currentPathPoint.x) : prevPathPoint.xValue,
                    dirn === 'H' ? prevPathPoint.yValue : new RestrictedValue(currentPathPoint.y)
                )

                this.pathPoints.push(pathPoint)
                prevPathPoint = pathPoint
                pathIndex += 1
                currentPathPoint = new Point(pathArray[pathIndex][1], pathArray[pathIndex][2])
            }
            // currentPathPoint is now the second to last path point but we don't yet have a control point for it
            if (this.lastElement.pointOutside(currentPathPoint, CONNECTION_SPLAY_PADDING)) {
                const dirn = direction(prevPathPoint, currentPathPoint)
                const pathPoint = new PathPoint(
                    dirn === 'H' ? new RestrictedValue(currentPathPoint.x) : prevPathPoint.xValue,
                    dirn === 'H' ? prevPathPoint.yValue : new RestrictedValue(currentPathPoint.y)
                )
                this.pathPoints.push(pathPoint)
                prevPathPoint = pathPoint
            }
            const lastPathPoints = RectilinearPath.#elementPathPoints(this.lastElement, currentPathPoint)
            lastPathPoints.reverse()

            if (this.pathPoints.length > 2) {
                const dirn = direction(prevPathPoint, lastPathPoints[0])
                if (dirn === 'H') {
                    prevPathPoint.yValue = lastPathPoints[0].yValue
                } else {
                    prevPathPoint.xValue = lastPathPoints[0].xValue
                }
            }
            this.pathPoints.push(...lastPathPoints)
        }
    }

    #splitPath(dirn: string, firstIndex: number) {
        // Splitting between first at second
        const firstPoint = this.pathPoints[firstIndex]!
        const secondPoint = this.pathPoints[firstIndex + 1]!
        let newPoints: PathPoint[] = [] //firstPoint]
        if (dirn === 'H') {
            const midX = new RestrictedValue((firstPoint.x + secondPoint.x) / 2)
            newPoints = [new PathPoint(midX, firstPoint.yValue), new PathPoint(midX, secondPoint.yValue)]
        } else {
            const midY = new RestrictedValue((firstPoint.y + secondPoint.y) / 2) //, firstPoint.y, secondPoint.y)
            newPoints = [new PathPoint(firstPoint.xValue, midY), new PathPoint(secondPoint.xValue, midY)]
        }
        if (newPoints.length) {
            this.pathPoints.splice(firstIndex + 1, 0, ...newPoints)
        }
    }

    #repositionSplayPoint(
        splayPoint: PathPoint,
        index: number,
        face: string,
        component: BoundedElement,
        delta: PointLike
    ) {
        const nPoints = this.pathPoints.length
        const boundaryPoint = this.pathPoints.at(index)!
        splayPoint.adjustValue(delta)
        const boundaryIntersection = component.boundaryIntersections(splayPoint)[0]
        if (boundaryIntersection) {
            boundaryPoint.reassignPosition(boundaryIntersection)
        }
        const dirn = ['L', 'R'].includes(face) ? 'H' : ['T', 'B'].includes(face) ? 'V' : ''
        if (nPoints === 4) {
            if (index === 0) {
                if (
                    (dirn === 'H' && !roundEqual(splayPoint.y, this.pathPoints[2]!.y)) ||
                    (dirn === 'V' && !roundEqual(splayPoint.x, this.pathPoints[2]!.x))
                ) {
                    //splayPoint.x !== this.pathPoints[2].x) {
                    this.#splitPath(dirn, 1)
                }
            } else {
                if (
                    (dirn === 'H' && !roundEqual(splayPoint.y, this.pathPoints[nPoints - 3]!.y)) ||
                    (dirn === 'V' && !roundEqual(splayPoint.x, this.pathPoints[nPoints - 3]!.x))
                ) {
                    //splayPoint.x !== this.pathPoints[nPoints-3].x) {
                    this.#splitPath(dirn, nPoints - 3)
                }
            }
        }
    }

    protected resizeComponentBoundingBox(index: number, component: BoundedElement, cornerDeltas: [Point, Point]) {
        //  [TL, BR]
        const nPoints = this.pathPoints.length
        let splayPoint: PathPoint
        if (index === 0) {
            splayPoint = this.pathPoints[index + 1]!
        } else if (index === nPoints - 1) {
            splayPoint = this.pathPoints[index - 1]!
        } else {
            return
        }
        const face = component.boundaryFace(splayPoint)
        if (face === 'L') {
            this.#repositionSplayPoint(splayPoint, index, face, component, { x: cornerDeltas[1].x, y: 0 })
        } else if (face === 'R') {
            this.#repositionSplayPoint(splayPoint, index, face, component, { x: cornerDeltas[0].x, y: 0 })
        } else if (face === 'T') {
            this.#repositionSplayPoint(splayPoint, index, face, component, { x: 0, y: cornerDeltas[1].y })
        } else if (face === 'B') {
            this.#repositionSplayPoint(splayPoint, index, face, component, { x: 0, y: cornerDeltas[0].y })
        }
    }

    protected moveComponentBoundingBox(index: number, component: BoundedElement, centroidDelta: Point) {
        const nPoints = this.pathPoints.length
        let splayPoint: PathPoint
        if (index === 0) {
            splayPoint = this.pathPoints[index + 1]!
        } else if (index === nPoints - 1) {
            splayPoint = this.pathPoints[index - 1]!
        } else {
            return
        }
        const face = component.boundaryFace(splayPoint)
        this.#repositionSplayPoint(splayPoint, index, face, component, centroidDelta)
    }

    #moveSplayPoint(splayPoint: PathPoint, boundaryPoint: PathPoint, position: PointLike) {
        let intersections = boundaryPoint.component!.boundaryIntersections(position)
        if (intersections[1]) {
            const dirn = ['L', 'R'].includes(intersections[2]) ? 'H' : 'V'
            splayPoint.move(intersections[1], {
                noAlignX: dirn === 'H',
                noAlignY: dirn === 'V',
                resolution: 0.2
            })
            intersections = boundaryPoint.component!.boundaryIntersections(splayPoint, 0)
        }
        if (intersections[0]) {
            boundaryPoint.reassignPosition(intersections[0])
        }
    }

    #updateComponentBoundaryPoint(boundaryPoint: PathPoint, position: PointLike) {
        const intersections = boundaryPoint.component!.boundaryIntersections(position, 0)
        if (intersections[0]) {
            boundaryPoint.reassignPosition(intersections[0])
        }
    }

    protected movePathPoint(position: PointLike) {
        const pathPoint = this.movePoint!
        const startPosition = Point.fromPoint(pathPoint)
        const nPoints = this.pathPoints.length
        if (this.moveIndex === 1) {
            // first splay point
            this.#moveSplayPoint(pathPoint, this.pathPoints[this.moveIndex - 1], position)
            const dirn = direction(startPosition, this.pathPoints[2])
            if (
                (dirn === 'H' && !roundEqual(pathPoint.y, this.pathPoints[2].y)) || //pathPoint.y !== this.pathPoints[2].y
                (dirn === 'V' && !roundEqual(pathPoint.x, this.pathPoints[2].x))
            ) {
                //pathPoint.x !== this.pathPoints[2].x) {
                this.#splitPath(dirn, 1)
            }
        } else if (this.moveIndex === nPoints - 2) {
            // last splay point
            this.#moveSplayPoint(pathPoint, this.pathPoints[this.moveIndex + 1], position)
            const dirn = direction(startPosition, this.pathPoints[nPoints - 3])
            if (
                (dirn === 'H' && !roundEqual(pathPoint.y, this.pathPoints[nPoints - 3].y)) || //pathPoint.y !== this.pathPoints[nPoints-3].y
                (dirn === 'V' && !roundEqual(pathPoint.x, this.pathPoints[nPoints - 3].x))
            ) {
                //pathPoint.x !== this.pathPoints[nPoints-3].x) {
                this.#splitPath(dirn, nPoints - 3)
            }
        } else {
            let alignedPosition = editGuides.gridAlign(pathPoint.offsetPoint(position))
            if (this.moveIndex === 2) {
                const dirn = direction(this.pathPoints[1], this.pathPoints[2])
                if (this.firstElement.containsPoint(alignedPosition, CONNECTION_SPLAY_PADDING)) {
                    if (dirn === 'H') {
                        alignedPosition = new Point(this.pathPoints[1].x, alignedPosition.y)
                    } else {
                        alignedPosition = new Point(alignedPosition.x, this.pathPoints[1].y)
                    }
                } else {
                    if (dirn === 'H') {
                        alignedPosition = alignedPosition.snapTo(new Point(this.pathPoints[1].x, alignedPosition.y))
                    } else {
                        alignedPosition = alignedPosition.snapTo(new Point(alignedPosition.x, this.pathPoints[1].y))
                    }
                }
            } else if (
                this.moveIndex === nPoints - 3 &&
                this.lastElement.containsPoint(alignedPosition, CONNECTION_SPLAY_PADDING)
            ) {
                const dirn = direction(this.pathPoints[this.moveIndex], this.pathPoints[this.moveIndex + 1])
                if (this.lastElement.containsPoint(alignedPosition, CONNECTION_SPLAY_PADDING)) {
                    if (dirn === 'H') {
                        alignedPosition = new Point(this.pathPoints[this.moveIndex + 1].x, alignedPosition.y)
                    } else {
                        alignedPosition = new Point(alignedPosition.x, this.pathPoints[this.moveIndex + 1].y)
                    }
                } else {
                    if (dirn === 'H') {
                        alignedPosition = alignedPosition.snapTo(
                            new Point(this.pathPoints[this.moveIndex + 1].x, alignedPosition.y)
                        )
                    } else {
                        alignedPosition = alignedPosition.snapTo(
                            new Point(alignedPosition.x, this.pathPoints[this.moveIndex + 1].y)
                        )
                    }
                }
            }
            pathPoint.move(alignedPosition, { noAlign: true, noOffset: true })
            if (nPoints >= 5) {
                if (this.moveIndex === 2) {
                    // point after first splay point
                    this.#updateComponentBoundaryPoint(
                        this.pathPoints[this.moveIndex - 2],
                        this.pathPoints[this.moveIndex - 1].point
                    )
                }
                if (this.moveIndex === nPoints - 3) {
                    // point befor last splay point
                    this.#updateComponentBoundaryPoint(
                        this.pathPoints[this.moveIndex + 2],
                        this.pathPoints[this.moveIndex + 1].point
                    )
                }
            }
        }
    }

    /*
     *  5) Path simplification is a process of edge renewal and joining, and happens at
     *     the end of a move, immediately before the SVG <path> is set.
     *  6) Only ``H`` and ``V`` edges can be removed.
     *  6) An edge is removed if it has zero length; one end of this edge will be the node
     *     used for the move operation.
     *  7) If the removed edge was connected to an ``S`` edge, simplification stops
     *     with edge removal.
     *  8) Otherwise the two adjacent ``H`` or ``V`` edges of the removed edge are
     *     combined and simplification stops.
     */
    protected simplifyPathPoints(): PathPoint[] | null {
        // Check for and remove identical control points

        const nPoints = this.pathPoints.length
        if (nPoints <= 4) {
            return null
        }
        // Work with a local copy so as not to change values in the original
        const pathPoints = this.pathPoints.map((cp) => cp.copy())
        const edges = getEdges(pathPoints)
        // First remove all zero length edges
        let index = 0
        const cleanEdges: PathEdge[] = []
        for (const edge of edges) {
            if (edge.direction === 'S') {
                cleanEdges.push(edge)
            } else {
                if (roundEqual(edge.length, 0)) {
                    // remove index
                    if (edges[index - 1].direction === 'S') {
                        edge.pathPoints[1].removeSvgElement()
                        edges[index + 1].pathPoints[0] = edge.pathPoints[0]
                    } else if (edges[index + 1].direction === 'S') {
                        edge.pathPoints[0].removeSvgElement()
                        edges[index - 1].pathPoints[1] = edge.pathPoints[1]
                    } else {
                        edge.pathPoints[0].removeSvgElement()
                        edge.pathPoints[1].removeSvgElement()
                        edges[index + 1].pathPoints[0] = edge.pathPoints[0]
                        edges[index - 1].pathPoints[1] = edge.pathPoints[1]
                    }
                } else {
                    cleanEdges.push(edge)
                }
            }
            index += 1
        }
        // Now combine adjacent edges with the same direction
        index = 0
        const newEdges: PathEdge[] = []
        while (index < cleanEdges.length) {
            const edge = cleanEdges[index]
            if (edge.direction === 'S') {
                newEdges.push(edge)
            } else {
                let combinedEdge = edge
                while (index < cleanEdges.length - 1 && edge.direction === cleanEdges[index + 1].direction) {
                    const newEdge = combinedEdge.combine(cleanEdges[index + 1])
                    if (newEdge) {
                        combinedEdge = newEdge
                    } else {
                        break
                    }
                    index += 1
                }
                newEdges.push(combinedEdge)
            }
            index += 1
        }
        const newPoints = newEdges.map((edge) => edge.pathPoints[0])
        newPoints.push(newEdges[newEdges.length - 1].pathPoints[1])
        if (newPoints.length === nPoints) {
            return null
        }
        return newPoints
    }
}

//==============================================================================
