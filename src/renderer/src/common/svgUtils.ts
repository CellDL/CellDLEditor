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

import { type PointLike } from '@renderer/common/points'
import { CONNECTION_COLOUR, CONNECTION_WIDTH, CONNECTION_DASH } from '@renderer/common/styling'
import { type StringProperties } from '@renderer/common/types'
import { latexAsSvgDocument } from '@renderer/mathjax/index'

import { type Extent } from '@editor/geometry/index'
import { lengthToPixels, pixelsToLength } from '@editor/geometry/units'
import { round } from '@editor/utils'

//==============================================================================

export const SVG_URI = 'http://www.w3.org/2000/svg'

//==============================================================================

export interface IPathStyle {
    colour: string   // defaut is CONNECTION_COLOUR (with opacity of 0.7)
    width: number    // default is CONNECTION_WIDTH (but +2 when selected)
    dashed: boolean  // set `dashed` class`
}

//==============================================================================

export interface LatexMathSvgOptions {
    background?: string|string[]
    border?: string
    'border-width'?: string
    class?: string
    'corner-radius'?: string
    'middle-colour'?: string
    'min-height'?: string
    'min-width'?: string
    padding?: string
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

function latexToSvgRect(latex: string, suffix: string,
    options: LatexMathSvgOptions={},
    includeStyleRules:boolean=false): string
{
    let svgDocument = latexAsSvgDocument(latex)
    let svgElement: SVGSVGElement = (<Element>svgDocument.documentElement) as SVGSVGElement
    const svgWidth = lengthToPixels(svgElement.getAttribute('width')) || 0
    const svgHeight = lengthToPixels(svgElement.getAttribute('height')) || 0
    let gradient: string[] = []
    if (svgWidth && svgHeight) {
        let viewBox = getViewbox(svgElement)
        const scale = [viewBox[2]/svgWidth, viewBox[3]/svgHeight]
        const border = ('border' in options) ? getLengthFromOptions(options, 'border-width') : 0
        const padding = getLengthFromOptions(options, 'padding')
        let width = scale[0]!*Math.max(2*border + 2*padding + svgWidth, getLengthFromOptions(options, 'min-width'))
        const extrawidth = width - scale[0]!*svgWidth
        const left = viewBox[0] - extrawidth/2
        let right = left + width

        let height = scale[1]!*Math.max(2*border + 2*padding + svgHeight, getLengthFromOptions(options, 'min-height'))
        const extraHeight = height - scale[1]!*svgHeight
        let top = viewBox[1] - extraHeight/2
        let bottom = top + height

        const rectSize = ` width="${round(width-2*border*scale[0]!)}" height="${round(height-2*border*scale[1]!)}"`
        if (suffix !== '') {
            const suffixLatex = (suffix !== '') ? `\\;${suffix}` : ''
            svgDocument = latexAsSvgDocument(`${latex}${suffixLatex}`)
            svgElement = (<Element>svgDocument.documentElement) as SVGSVGElement
            viewBox = getViewbox(svgElement)
            right = Math.max(right, viewBox[0] + viewBox[2] + scale[0]!*padding)
            top = Math.min(top, viewBox[1] - scale[1]!*(padding + border))
            bottom = Math.max(bottom, viewBox[1] + viewBox[3] + scale[1]!*(padding + border))

            // We add `data-centre-x` and `data-centre-y` attributes to the root <svg> element,
            // giving the ratios needed to find the centre of the unsuffixed text.
            svgElement.dataset.centreX = `${round(0.5*width/(right - left))}`
            svgElement.dataset.centreY = `${round(0.5*height/(bottom - top))}`
            width = right - left
            height = bottom - top
        }
        let verticalAlign = scale[1]!*getLengthFromOptions(options, 'vertical-align')
        if (verticalAlign) {
            bottom = -verticalAlign
            top = bottom - height
        } else {
            verticalAlign = -bottom
        }
        svgElement.style.setProperty('vertical-align', pixelsToLength(verticalAlign/scale[1]!, 'ex'))
        viewBox[0] = round(left)
        viewBox[1] = round(top)
        viewBox[2] = round(width)
        viewBox[3] = round(height)
        svgElement.setAttribute('viewBox', viewBox.map(n => '' + n).join(' '))
        svgElement.setAttribute('width', pixelsToLength(width/scale[0]!, 'ex')!)
        svgElement.setAttribute('height', pixelsToLength(height/scale[1]!, 'ex')!)

        let fill: string
        let dataFillStyle: string[] = []
        if (!options.background) {
            fill = 'transparent'
            dataFillStyle.push(fill)
        } else if (Array.isArray(options.background)) {
            const stopColours: string[] = [...options.background]
            let direction = 'H'
            if (stopColours.length && ['H', 'V'].includes(stopColours[0]!)) {
                direction = stopColours.shift()!
            }
            if (stopColours.length === 0) {
                fill = 'transparent'
                dataFillStyle.push(fill)
            } else if (stopColours.length === 1) {
                fill = stopColours[0]!.trim()
                dataFillStyle.push(fill)
            } else {
                dataFillStyle.push(direction)
                const gradientFillId = 'fill'
                const transform = (direction === 'V') ? 'gradientTransform="rotate(90)"' : ''
                gradient.push(`<linearGradient id="${gradientFillId}" ${transform}>`)
                if (stopColours.length === 2 && options['middle-colour']) {
                    let colour = stopColours[0]!.trim()
                    gradient.push(`<stop stop-color="${colour}" offset="0%"/>`)
                    dataFillStyle.push(colour)
                    gradient.push(`<stop stop-color="${options['middle-colour']}" offset="50%"/>`)
                    colour = stopColours[1]!.trim()
                    gradient.push(`<stop stop-color="${colour}" offset="100%"/>`)
                    dataFillStyle.push(colour)
                } else {
                    const stops = stopColours.length - 1
                    stopColours.forEach((colour: string, index: number) => {
                        colour = colour.trim()
                        gradient.push(`<stop stop-color="${colour}" offset="${100*index/stops}%"/>`)
                        dataFillStyle.push(colour)
                    })
                }
                gradient.push('</linearGradient>')
                fill = `url(#${gradientFillId})`
            }
        } else {
            fill = options.background.trim()
            dataFillStyle.push(fill)
        }
        const stroke = border ? ` stroke="${options['border']}" stroke-width="${round(scale[0]!*border)}"` : ''
        const radius = getLengthFromOptions(options, 'corner-radius');
        const cornerRadius = radius ? ` rx="${round(radius*scale[0]!)}"` : ''
        const topLeft = `x="${round(viewBox[0]+border*scale[0]!)}" y="${round(viewBox[1]+border*scale[1]!)}"`
        const rectClass = options.class ? ` class="${options['class']}"` : ''
        const bgRect = `<rect ${topLeft}${rectSize} fill="${fill}" data-fill-style="${dataFillStyle.join(' ')}"${stroke}${cornerRadius}${rectClass}></rect>`
        svgElement.firstElementChild!.insertAdjacentHTML('afterend', bgRect)

        if (suffix !== '') {
            const topLeft = `x="${viewBox[0]+border*scale[0]!}" y="${viewBox[1]+border*scale[1]!}"`;
            const boundingRect = `<rect ${topLeft} width="${width-2*border*scale[0]!}"
                                                                  height="${height-2*border*scale[1]!}"></rect>`
            svgElement.insertAdjacentHTML('afterbegin', boundingRect)
        }
    }
    const svgSerialiser = new XMLSerializer()
    let svg = svgSerialiser.serializeToString(svgDocument)
    if (gradient.length) {
        svg = svg.replace(/<defs>/, `<defs>${gradient.join('')}`)
    }
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

export function getSvgImageFromBase64(svgText: string): string|undefined {
    const re = /<image href="data:image\/svg\+xml;base64,(?<base64>.*)"><\/image>/
    const base64 = svgText.match(re)
    if (base64) {
        return Buffer.from(base64.groups!.base64!, 'base64').toString('utf8')
    }
}

//==============================================================================

export function getSvgFillStyle(svgText: string): string[] {
    const svgData = getSvgImageFromBase64(svgText)
    if (svgData) {
        const fillStyle = svgData.match(/ data-fill-style="(?<fillStyle>[^"]*)"/)
        if (fillStyle) {
            return fillStyle.groups!.fillStyle!.split(' ')
        }
        const fill = svgData.match(/ fill="(?<fill>[^"]*)"/)
        if (fill && !fill.groups!.fill!.startsWith('url(')) {
            return fill
        }
        // Shouldn't get here...
        return ['yellow']
    }
    return []
}

//==============================================================================

export function getSvgPathStyle(svgElement: SVGGraphicsElement): IPathStyle {
    return {
        colour: svgElement.getAttribute('stroke') || CONNECTION_COLOUR,
        width: lengthToPixels(svgElement.getAttribute('stroke-width')) || CONNECTION_WIDTH,
        dashed: svgElement.hasAttribute('stroke-dasharray')
    }
}

export function setSvgPathStyle(svgElement: SVGGraphicsElement, pathStyle: IPathStyle) {
    svgElement.setAttribute('stroke', pathStyle.colour)
    svgElement.setAttribute('stroke-width', String(pathStyle.width))
    if (pathStyle.dashed) {
        svgElement.setAttribute('stroke-dasharray', String(CONNECTION_DASH*pathStyle.width))
    } else {
        svgElement.removeAttribute('stroke-dasharray')
    }
}

//==============================================================================
//==============================================================================
