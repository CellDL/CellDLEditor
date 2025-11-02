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

import { POINT_EPSILON_SQUARED, Point, type PointLike } from './points.ts'
import { NormalTransform } from './transforms.ts'

//==============================================================================

export type FoundPoint = {
    point: PointLike
    offset: number | null
    segment: number | null
}

//==============================================================================

export class PointFinder {
    #transforms: NormalTransform[] = []

    constructor(pathArray: NormalArray) {
        const pathPoints = pathArray
            .filter((p) => ['M', 'L'].includes(p[0]))
            // @ts-expect-error: p.slice(1) will be two numbers
            .map((p) => Point.fromArray(p.slice(1)))
        for (let segment = 0; segment < pathPoints.length - 1; segment += 1) {
            this.#transforms.push(new NormalTransform(pathPoints[segment], pathPoints[segment + 1]))
        }
    }

    findPoint(point: PointLike): FoundPoint {
        for (let segment = 0; segment < this.#transforms.length; segment += 1) {
            const p = this.#transforms[segment].normalise(point)
            if (p.x >= 0 && p.x <= 1.0 && p.y * p.y < POINT_EPSILON_SQUARED) {
                return {
                    point: this.#transforms[segment].invert({ x: p.x, y: 0 }),
                    offset: segment + p.x,
                    segment
                }
            }
        }
        return {
            point,
            offset: null,
            segment: null
        }
    }
}

//==============================================================================
