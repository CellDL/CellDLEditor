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

import type { CellDLObject } from '@renderer/celldlObjects'
import { CELL_NAMESPACE } from '@renderer/metadata'
import { gradientDefinition } from '@renderer/styles/stylesheet'

import { type TemplateProperties, ComponentTemplate } from '@renderer/libraries/component'
import LatexMath from '@renderer/libraries/mathjax'
import type { LibraryDefinition } from '@renderer/libraries/manager'

import type { Constructor } from '@renderer/types'

//==============================================================================

class CellElement {
    getLatex() {
        //========
        return ''
    }

    copy(): CellElement {
        //=================
        return new CellElement()
    }
}

//==============================================================================

class Transporter extends CellElement {
    #label: string

    constructor(label: string = 'GLUT2') {
        super()
        this.#label = label
    }

    getLatex() {
        //========
        return `\\text{${this.#label}}` // \\textcolor{${this.#colour}}
    }

    copy(): Transporter {
        //=================
        return new Transporter(this.#label)
    }
}

//==============================================================================

class CellComponent extends ComponentTemplate {
    #ElementClass: Constructor<CellElement>
    #elementNode: CellElement

    private constructor(
        readonly CellDLClass: Constructor<CellDLObject>,
        uri: string,
        ElementClass: Constructor<CellElement>,
        elementNode: CellElement | null = null
    ) {
        if (elementNode === null) {
            elementNode = new ElementClass()
        }
        super(CellDLClass, uri)
        this.#ElementClass = ElementClass
        this.#elementNode = elementNode

        this.#updateSvg()
    }

    static newCellComponent(CellDLClass: Constructor<CellDLObject>, uri: string): CellComponent {
        //===================================================-=====================================
        if (CellComponentElements.has(uri)) {
            const ElementClass = CellComponentElements.get(uri)
            return new CellComponent(CellDLClass, uri, ElementClass!)
        } else {
            throw new Error(`Unknown cell component, URI: ${uri}`)
        }
    }

    copy(): CellComponent {
        //===================
        const copy = new CellComponent(this.CellDLClass, this.uri, this.#ElementClass, this.#elementNode.copy())
        copy.assign(this)
        return copy
    }

    // this is to do with an instance of the CellComponent...
    updateTemplateProperties(_properties: TemplateProperties) {
        //========================================================
        this.#updateSvg()
        return true
    }

    #updateSvg() {
        //==========
        this.setSvg(
            LatexMath.svg(this.#elementNode.getLatex(), '', {
                'min-width': '8ex',
                'min-height': '6ex',
                'vertical-align': '-2.2ex',
                'border-width': '2px',
                padding: '3px',
                'corner-radius': '10px',
                background: '#fa4',
                // gradient backround...
                border: '#444'
            })
        )
    }
}

//==============================================================================

import { LIBRARY_DESCRIPTION } from './description'

const GLUT2 = CELL_NAMESPACE('Transporter')

const CellComponentElements: Map<string, Constructor<CellElement>> = new Map([[GLUT2.uri, Transporter]])

export const cellComponentLibrary: LibraryDefinition = {
    id: 'cell',
    title: 'Cell Components',
    rdfDefinition: LIBRARY_DESCRIPTION,
    templates: Array.from(CellComponentElements.keys()),
    defaultComponent: GLUT2.uri,
    componentFactory: CellComponent.newCellComponent,
    svgDefinitions: [
        gradientDefinition('linear', 'enzyme-gradiant', [
            { offset: '5%', colour: '#F92' },
            { offset: '45%', colour: '#FED' },
            { offset: '55%', colour: '#FED' },
            { offset: '95%', colour: '#F92' }
        ])
    ],
    styleRules: '.cell-enzyme{fill:url("#enzyme-gradiant")}'
}

//==============================================================================
