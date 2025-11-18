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

/*************************************************************************
 *
 *  direct/tex2svg
 *
 *  Uses MathJax v3 to convert a TeX string to an SVG string.
 *
 * ----------------------------------------------------------------------
 *
 *  Copyright (c) 2018 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

//  Load the packages needed for MathJax
import { mathjax } from '@mathjax/src/js/mathjax.js'
import { TeX, type TexError } from '@mathjax/src/js/input/tex.js'
import { SVG } from '@mathjax/src/js/output/svg.js'
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js'
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js'
import { STATE } from '@mathjax/src/js/core/MathItem.js'
import '@mathjax/src/js/util/asyncLoad/esm.js'

import '@mathjax/src/js/input/tex/base/BaseConfiguration.js'
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js'
import '@mathjax/src/js/input/tex/color/ColorConfiguration'
import '@mathjax/src/js/input/tex/mhchem/MhchemConfiguration'

//==============================================================================

import { getViewbox, SVG_URI } from '@renderer/common/svgUtils'

import { type Extent } from '@editor/geometry/index'
import { EM_SIZE, EX_SIZE, lengthToPixels, pixelsToLength } from '@editor/geometry/units'
import { round } from '@editor/utils'

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

//  Create DOM adaptor and register it for HTML documents
const adaptor = liteAdaptor({ fontSize: EM_SIZE })
RegisterHTMLHandler(adaptor)

//==============================================================================

const tex = new TeX({
    packages: ['base', 'ams', 'color', 'mhchem'],
    formatError(_: any, error: TexError) {
        throw Error(`LaTeX: ${error.message}`)
    }
})
const svg = new SVG({
    fontCache: 'local'
})

const html = mathjax.document('', {
    InputJax: tex,
    OutputJax: svg,
    renderActions: {
        removeLatex: [  // remove latex specific attributes
            STATE.CONVERT + 1,
            () => {},
            (math: any, _doc: any) => {
                math.root.walkTree((node: any) => {
                    const attributes = node.attributes
                    attributes.unset('data-latex')
                    attributes.unset('data-latex-item')
                })
            }
        ]
    }
})

//==============================================================================

function getLengthFromOptions(options: LatexMathOptions, key: string): number {
    // @ts-expect-error: `key` is an option
    const length = key in options ? lengthToPixels(options[key]) : null
    return length || 0
}

export function latexAsSvgString(latex: string): string {
    const node = html.convert(latex, {
        display: false, // process as inline math
        em: EM_SIZE,
        ex: EX_SIZE
    })
    return adaptor.innerHTML(node)
}

export function latexAsSvgDocument(latex: string): XMLDocument {
    const svg = latexAsSvgString(latex)
    return new DOMParser().parseFromString(svg, 'image/svg+xml')
}

function latexToSvg(
    latex: string,
    suffix: string,
    options: LatexMathOptions = {},
    includeStyleRules: boolean = false
): string {
    let svgDocument = latexAsSvgDocument(latex)

    let svgElement: SVGSVGElement = (<Element>svgDocument.documentElement) as SVGSVGElement
    const svgWidth = lengthToPixels(svgElement.getAttribute('width'))
    const svgHeight = lengthToPixels(svgElement.getAttribute('height'))
    if (svgWidth && svgHeight) {
        let viewBox = getViewbox(svgElement)
        const scale: [number, number] = [viewBox[2] / svgWidth, viewBox[3] / svgHeight]
        const border = 'border' in options ? getLengthFromOptions(options, 'border-width') : 0
        const padding = getLengthFromOptions(options, 'padding')
        let width = scale[0] * Math.max(2 * border + 2 * padding + svgWidth, getLengthFromOptions(options, 'min-width'))
        const extrawidth = width - scale[0] * svgWidth
        const left = viewBox[0] - extrawidth / 2
        let right = left + width

        let height =
            scale[1] * Math.max(2 * border + 2 * padding + svgHeight, getLengthFromOptions(options, 'min-height'))
        const extraHeight = height - scale[1] * svgHeight
        let top = viewBox[1] - extraHeight / 2
        let bottom = top + height

        const rectSize = ` width="${round(width - 2 * border * scale[0])}" height="${round(height - 2 * border * scale[1])}"`
        if (suffix !== '') {
            const suffixLatex = suffix !== '' ? `\\;${suffix}` : ''
            svgDocument = latexAsSvgDocument(`${latex}${suffixLatex}`)
            svgElement = (<Element>svgDocument.documentElement) as SVGSVGElement
            viewBox = getViewbox(svgElement)
            right = Math.max(right, viewBox[0] + viewBox[2] + scale[0] * padding)
            top = Math.min(top, viewBox[1] - scale[1] * (padding + border))
            bottom = Math.max(bottom, viewBox[1] + viewBox[3] + scale[1] * (padding + border))

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

        console.log(svgElement.getAttribute('style'))
        // NB. this overwrites all existing styling whereas we just need to update `vertical-align``
        svgElement.setAttribute('style', `vertical-align: ${pixelsToLength(verticalAlign / scale[1], 'ex')};`)
        console.log(svgElement.getAttribute('style'))

        viewBox[0] = round(left)
        viewBox[1] = round(top)
        viewBox[2] = round(width)
        viewBox[3] = round(height)
        svgElement.setAttribute('viewBox', viewBox.map((n: number) => '' + n).join(' '))
        svgElement.setAttribute('width', pixelsToLength(width / scale[0], 'ex')!)
        svgElement.setAttribute('height', pixelsToLength(height / scale[1], 'ex')!)

        const bgRect = svgDocument.createElement('rect')
        bgRect.setAttribute('fill', `${options.background || 'transparent'}`)
        if (border) {
            bgRect.setAttribute('stroke', `${options['border']}" stroke-width="${round(scale[0] * border)}`)
        }
        const radius = getLengthFromOptions(options, 'corner-radius')
        let cornerRadius = ''
        if (radius) {
            cornerRadius = `${round(radius * scale[0])}`
            bgRect.setAttribute('rx', cornerRadius)
        }
        bgRect.setAttribute('x', `${round(viewBox[0] + border * scale[0])}`)
        bgRect.setAttribute('y', `${round(viewBox[1] + border * scale[1])}`)
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
            boundingRect.setAttribute('x', `${viewBox[0] + border * scale[0]}`)
            boundingRect.setAttribute('y', `${viewBox[1] + border * scale[1]}`)
            boundingRect.setAttribute('width', `${width - 2 * border * scale[0]}`)
            boundingRect.setAttribute('height', `${height - 2 * border * scale[1]}`)
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

export interface LatexMathOptions {
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

export default class LatexMath {
    static #svgCache: Map<string, string> = new Map()

    static svg(latex: string, suffix: string = '', options: LatexMathOptions = {}): string {
        let svg = ''
        const key = `${latex}${suffix}-${JSON.stringify(options)}`
        if (LatexMath.#svgCache.has(key)) {
            svg = LatexMath.#svgCache.get(key)!
        } else {
            svg = latexToSvg(latex, suffix, options)
            LatexMath.#svgCache.set(key, svg)
        }
        return svg
    }
}

//==============================================================================
//==============================================================================
