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

import { base64Svg, LatexMathSvg } from '@renderer/common/svgUtils'

import { BGBaseComponent } from './index'
import {
    type BGComponentDefinition,
    type BGComponentLibraryTemplate,
    type BGElementStyle
} from './utils'

//==============================================================================
//==============================================================================

const ICON_BORDER= '2px'
const ICON_PADDING = '3px'
const ICON_MIN_WIDTH = '3.5ex'
const ICON_MIN_HEIGHT = '4ex'
const ICON_VERTICAL_ALIGN = '-1.5ex'
const ICON_RADIUS = '6px'

const MIN_BORDER = '0.2px'
const MIN_BORDER_COLOUR = 'grey'

//==============================================================================

const DEFAULT_SPECIES = 'i'
const DEFAULT_LOCATION = 'j'

//==============================================================================
//==============================================================================

const FLOW_STYLE: BGElementStyle = {
    text: '#00B050',
    background: '#E2F0D9'
}

const POTENTIAL_STYLE: BGElementStyle = {
    text: '#FF0909',
    background: '#FBE4D5'
}

const POTENTIAL_STORAGE_STYLE: BGElementStyle = {
    text: '#00B050',
    background: '#E2F0D9'
}

const KINETIC_STORAGE_STYLE: BGElementStyle = {
    text: 'black',
    background: 'lightgrey'
}

const REACTION_STYLE: BGElementStyle = {
    text: '#72329F',
    background: '#FFD966',
    border: 'black'
}

const RESISTANCE_STYLE: BGElementStyle = {
    text: '#444',
    background: REACTION_STYLE.background
}
const ONE_RESISTANCE_STYLE: BGElementStyle = {
    text: RESISTANCE_STYLE.text,
    background: RESISTANCE_STYLE.background,
    border: 'green'
}

const SCALE_STYLE: BGElementStyle = {
    text: '#7030A0',
    background: '#C1C1FA'
}

const UNITS_STYLE: BGElementStyle = {
    text: '#444',
    background: '#DDD'
}

const ZERO_STORAGE_STYLE: BGElementStyle = {
    text: FLOW_STYLE.text,
    background: FLOW_STYLE.background,
    border: 'red'
}

//==============================================================================

export const BONDGRAPH_ICON_DEFINITIONS: BGComponentDefinition[] = [
    {
        id: 'ZeroStorageNode_q',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#ZeroStorageNode',
        name: 'Zero storage node (q)',
        symbol: 'q',
        style: ZERO_STORAGE_STYLE
    },
    {
        id: 'ZeroStorageNode_u',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#ZeroStorageNode',
        name: 'Zero storage node (u)',
        symbol: 'u',
        style: ZERO_STORAGE_STYLE
    },
    {
        id: 'OneResistanceNode',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#OneResistanceNode',
        name: 'One resistance node',
        symbol: 'v',
        style: ONE_RESISTANCE_STYLE
    },
    {
        id: 'QuantityStore',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#QuantityStore',
        name: 'Static energy store',
        symbol: 'q',
        style: POTENTIAL_STORAGE_STYLE
    },
    {
        id: 'ZeroNode',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#ZeroNode',
        name: 'Zero node',
        symbol: 'u',
        style: POTENTIAL_STYLE
    },
    {
        id: 'OneNode',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#OneNode',
        name: 'One node',
        symbol: 'v',
        style: FLOW_STYLE
    },
    {
        id: 'Dissipator',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#Dissipator',
        name: 'Dissipative element',
        symbol: 'R',
        style: RESISTANCE_STYLE
    },
    {
        id: 'Reaction',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#Reaction',
        name: 'Reaction',
        symbol: 'v',
        style: REACTION_STYLE
    },
    {
        id: 'TransformNode',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#TransformNode',
        name: 'Transform node',
        symbol: 'k',
        style: SCALE_STYLE,
        noSpeciesLocation: true
    },
    {
        id: 'FlowStore',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#FlowStore',
        name: 'Dynamic energy store',
        symbol: 'L',
        style: KINETIC_STORAGE_STYLE
    },
    {
        id: 'PotentialSource',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#PotentialSource',
        name: 'Potential source',
        symbol: 'Se',
        style: POTENTIAL_STYLE,
    },
    {
        id: 'FlowSource',
        uri: 'https://bg-rdf.org/ontologies/bondgraph-framework#FlowSource',
        name: 'Flow source',
        symbol: 'Sf',
        style: FLOW_STYLE,
    }
]

//==============================================================================
//==============================================================================

function typeset(latex: string, style: BGElementStyle, base64: boolean=false): string {
    const svg = LatexMathSvg.svgRect(latex, '', {
            'min-width': ICON_MIN_WIDTH,
            'min-height': ICON_MIN_HEIGHT,
            'vertical-align': ICON_VERTICAL_ALIGN,
            'border-width': style.border ? ICON_BORDER : MIN_BORDER,
            padding: ICON_PADDING,
            'corner-radius': ICON_RADIUS,
            background: style.background,
            'middle-colour': 'white',
            border: style.border || MIN_BORDER_COLOUR
        }
    )
    return base64 ? base64Svg(svg) : svg
}

function makeLatex(symbol: string, species: string|undefined,  location: string|undefined): string {
    const latex: string[] = [symbol]
    if (species) {
        latex.push(`^{${species}}`)
    }
    if (location) {
        latex.push(`_{${location}}`)
    }
    return latex.join('')
}

//======================================

export function svgImage(baseComponent: BGBaseComponent,
                         species: string|undefined,
                         location: string|undefined,
                         background: string[]|undefined) {
    const latex = makeLatex(baseComponent.template.symbol, species, location)
    const style = (!!background && background.length)
                ? Object.assign({}, baseComponent.style, { background })
                : baseComponent.style
    return typeset(latex, style)
}

//==============================================================================

export function definitionToLibraryTemplate(defn: BGComponentDefinition): BGComponentLibraryTemplate {
    const latex = defn.noSpeciesLocation ? defn.symbol : makeLatex(defn.symbol, DEFAULT_SPECIES, DEFAULT_LOCATION)

    return Object.assign({}, defn, {
        id: defn.uri,
        image: typeset(latex, defn.style, true)
    })
}

//==============================================================================
//==============================================================================
