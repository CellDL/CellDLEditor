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

import { Buffer } from 'buffer'

//==============================================================================

import { type PointLike } from '@renderer/common//points'
import { type StringProperties } from '@renderer/common/types'
import { latexAsSvgDocument } from '@renderer/mathjax/index'

import { type Extent } from '@editor/geometry/index'
import { lengthToPixels, pixelsToLength } from '@editor/geometry/units'
import { round } from '@editor/utils'

//==============================================================================

export const SVG_URI = 'http://www.w3.org/2000/svg'

//==============================================================================

export interface LatexMathSvgOptions {
    background?: string
    border?: string
    'border-width'?: string
    class?: string
    'corner-radius'?: string
    'min-height'?: string
    'min-width'?: string
    padding?: string
    'suffix-background'?: string
    'vertical-align'?: string
}

//==============================================================================

export function svgSize(svgDocument: Document): PointLike | null {
    const svgElement = svgDocument.documentElement
    const width = lengthToPixels(svgElement.getAttribute('width'))
    const height = lengthToPixels(svgElement.getAttribute('height'))
    if (width && height) {
        return {
            x: width,
            y: height
        }
    }
    return null
}

export function getViewbox(svgElement: SVGGraphicsElement): Extent {
    return svgElement
        .getAttribute('viewBox')
        ?.split(' ')
        .map((n) => +n) as Extent
}

//==============================================================================

type Attributes = StringProperties

export function createSVGElement(tagName: string, attributes: Attributes): SVGElement {
    const element = document.createElementNS(SVG_URI, tagName)
    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, value)
    }
    return element
}

function attributePairs(attributes: Attributes): string {
    const attributePairs: string[] = []
    for (const [key, value] of Object.entries(attributes)) {
        attributePairs.push(` ${key}="${value}"`)
    }
    return attributePairs.join('')
}

//==============================================================================

function svgCircleAttributes(c: PointLike, r: number, attributes: Attributes): Attributes {
    return Object.assign({}, attributes, {
        cx: `${c.x}`,
        cy: `${c.y}`,
        r: `${r}`
    })
}

export function svgCircle(centre: PointLike, radius: number, attributes: Attributes = {}): string {
    return `<circle${attributePairs(svgCircleAttributes(centre, radius, attributes))}/>`
}

export function svgCircleElement(centre: PointLike, radius: number, attributes: Attributes = {}): SVGCircleElement {
    return createSVGElement('circle', svgCircleAttributes(centre, radius, attributes)) as SVGCircleElement
}

//==============================================================================

export function svgPath(points: PointLike[], attributes: Attributes = {}): string {
    const description = svgPathDescription(points)
    return description ? `<path${attributePairs(attributes)} d="${description}"/>` : ''
}

export function svgPathDescription(points: PointLike[]): string {
    const pts = points.map((pt) => `${pt.x},${pt.y}`)
    return pts.length > 1 ? `M${pts.join(' L')}` : ''
}

export function svgPathElement(points: PointLike[], attributes: Attributes = {}): SVGPathElement {
    const description = svgPathDescription(points)
    return createSVGElement('path', Object.assign({}, attributes, { d: description })) as SVGPathElement
}

//==============================================================================

function svgRectAttributes(tl: PointLike, br: PointLike, attributes: Attributes): Attributes {
    return Object.assign({}, attributes, {
        x: `${Math.min(tl.x, br.x)}`,
        y: `${Math.min(tl.y, br.y)}`,
        width: `${Math.abs(br.x - tl.x)}`,
        height: `${Math.abs(br.y - tl.y)}`
    })
}

export function svgRect(topLeft: PointLike, bottomRight: PointLike, attributes: Attributes = {}): string {
    return `<rect${attributePairs(svgRectAttributes(topLeft, bottomRight, attributes))}/>`
}

export function svgRectElement(
    topLeft: PointLike,
    bottomRight: PointLike,
    attributes: StringProperties = {}
): SVGRectElement {
    return createSVGElement('rect', svgRectAttributes(topLeft, bottomRight, attributes)) as SVGRectElement
}

//==============================================================================
//==============================================================================

//  Minimal CSS needed for stand-alone image
export const LatexStyleRules = [
    'svg {color: black}', // default value of ``currentColor``
    'svg a{fill:blue;stroke:blue}',
    // Round the corners of filled background rectangles
    '[data-mml-node="mstyle"]>rect[data-bgcolor="true"]{rx: 8%; ry: 12%}',
    '[data-mml-node="merror"]>g{fill:red;stroke:red}',
    '[data-mml-node="merror"]>rect[data-background]{fill:yellow;stroke:none}',
    '[data-frame],[data-line]{stroke-width:70px;fill:none}',
    '.mjx-dashed{stroke-dasharray:140}',
    '.mjx-dotted{stroke-linecap:round;stroke-dasharray:0,140}',
    'use[data-c]{stroke-width:3px}'
].join('')

//==============================================================================

function getLengthFromOptions(options: LatexMathSvgOptions, key: string): number {
    // @ts-expect-error: `key` is an option
    const length = key in options ? lengthToPixels(options[key]) : null
    return length || 0
}

//==============================================================================

function latexToSvgRect(
    latex: string,
    suffix: string,
    options: LatexMathSvgOptions = {},
    includeStyleRules: boolean = false
): string {
    let svgDocument = latexAsSvgDocument(latex)
    let svgElement: SVGSVGElement = (<Element>svgDocument.documentElement) as SVGSVGElement

    const svgWidth = lengthToPixels(svgElement.getAttribute('width'))
    const svgHeight = lengthToPixels(svgElement.getAttribute('height'))
    if (svgWidth && svgHeight) {
        let viewBox = getViewbox(svgElement)
        const scale: [number, number] = [viewBox[2] / svgWidth, viewBox[3] / svgHeight]
        const border_width: number = 'border' in options ? getLengthFromOptions(options, 'border-width') : 0
        const padding = getLengthFromOptions(options, 'padding')
        let width = scale[0] * Math.max(2 * border_width + 2 * padding + svgWidth, getLengthFromOptions(options, 'min-width'))
        const extrawidth = width - scale[0] * svgWidth
        const left = viewBox[0] - extrawidth / 2
        let right = left + width

        let height =
            scale[1] * Math.max(2 * border_width + 2 * padding + svgHeight, getLengthFromOptions(options, 'min-height'))
        const extraHeight = height - scale[1] * svgHeight
        let top = viewBox[1] - extraHeight / 2
        let bottom = top + height

        const rectSize = ` width="${round(width - 2 * border_width * scale[0])}" height="${round(height - 2 * border_width * scale[1])}"`
        if (suffix !== '') {
            const suffixLatex = suffix !== '' ? `\\;${suffix}` : ''
            svgDocument = latexAsSvgDocument(`${latex}${suffixLatex}`)
            svgElement = (<Element>svgDocument.documentElement) as SVGSVGElement
            viewBox = getViewbox(svgElement)
            right = Math.max(right, viewBox[0] + viewBox[2] + scale[0] * padding)
            top = Math.min(top, viewBox[1] - scale[1] * (padding + border_width))
            bottom = Math.max(bottom, viewBox[1] + viewBox[3] + scale[1] * (padding + border_width))

            // We add `data-centre-x` and `data-centre-y` attributes to the root <svg> element,
            // giving the ratios needed to find the centre of the unsuffixed text.
            svgElement.dataset.centreX = `${round((0.5 * width) / (right - left))}`
            svgElement.dataset.centreY = `${round((0.5 * height) / (bottom - top))}`
            width = right - left
            height = bottom - top
        }
        let verticalAlign = scale[1] * getLengthFromOptions(options, 'vertical-align')
        if (verticalAlign) {
            bottom = -verticalAlign
            top = bottom - height
        } else {
            verticalAlign = -bottom
        }

        const styling = svgElement.getAttribute('style')
        if (styling) {
            const styles = ''
        }

        // NB. this overwrites all existing styling whereas we just need to update `vertical-align``
        svgElement.setAttribute('style', `vertical-align: ${pixelsToLength(verticalAlign / scale[1], 'ex')};`)

        viewBox[0] = round(left)
        viewBox[1] = round(top)
        viewBox[2] = round(width)
        viewBox[3] = round(height)
        svgElement.setAttribute('viewBox', viewBox.map((n: number) => '' + n).join(' '))
        svgElement.setAttribute('width', pixelsToLength(width / scale[0], 'ex')!)
        svgElement.setAttribute('height', pixelsToLength(height / scale[1], 'ex')!)

        const bgRect = svgDocument.createElement('rect')
        bgRect.setAttribute('fill', `${options.background || 'transparent'}`)
        if (border_width) {
            bgRect.setAttribute('stroke', options.border!)
            bgRect.setAttribute('stroke-width', String(round(scale[0] * border_width)))
        }
        const radius = getLengthFromOptions(options, 'corner-radius')
        let cornerRadius = ''
        if (radius) {
            cornerRadius = `${round(radius * scale[0])}`
            bgRect.setAttribute('rx', cornerRadius)
        }
        bgRect.setAttribute('x', `${round(viewBox[0] + border_width * scale[0])}`)
        bgRect.setAttribute('y', `${round(viewBox[1] + border_width * scale[1])}`)
        if (options.class) {
            bgRect.setAttribute('class', `"${options['class']}"`)
        }
        if (svgElement.firstChild) {
            svgElement.insertBefore(bgRect, svgElement.firstChild.nextSibling)
        } else {
            svgElement.appendChild(bgRect)
        }
        if (suffix !== '') {
            const boundingRect = svgDocument.createElement('rect')
            boundingRect.setAttribute('x', `${viewBox[0] + border_width * scale[0]}`)
            boundingRect.setAttribute('y', `${viewBox[1] + border_width * scale[1]}`)
            boundingRect.setAttribute('width', `${width - 2 * border_width * scale[0]}`)
            boundingRect.setAttribute('height', `${height - 2 * border_width * scale[1]}`)
            if (cornerRadius !== '') {
                boundingRect.setAttribute('rx', cornerRadius)
            }
            boundingRect.setAttribute(
                'fill',
                `${
                    'suffix-background' in options && options['suffix-background'] !== ''
                        ? options['suffix-background']
                        : 'transparent'
                }`
            )
            if (svgElement.firstChild) {
                svgElement.insertBefore(boundingRect, svgElement.firstChild.nextSibling)
            } else {
                svgElement.appendChild(boundingRect)
            }
        }
    }
    const svgSerialiser = new XMLSerializer()
    const svg = svgSerialiser.serializeToString(svgDocument)
    return includeStyleRules ? svg.replace(/<defs>/, `<defs><style>${LatexStyleRules}</style>`) : svg
}

//==============================================================================

export class LatexMathSvg {
    static #svgCache: Map<string, string> = new Map()

    static svgRect(latex: string, suffix: string = '', options: LatexMathSvgOptions = {}): string {
        let svg = ''
        const key = `${latex}${suffix}-${JSON.stringify(options)}`
        if (LatexMathSvg.#svgCache.has(key)) {
            svg = LatexMathSvg.#svgCache.get(key)!
        } else {
            svg = latexToSvgRect(latex, suffix, options)
            LatexMathSvg.#svgCache.set(key, svg)
        }
        return svg
    }
}


//==============================================================================

export function base64Svg(svg: string): string {
    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}

//==============================================================================
//==============================================================================
