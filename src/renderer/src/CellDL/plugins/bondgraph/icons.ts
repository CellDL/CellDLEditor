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
import { type ComponentLibraryTemplate } from '@editor/components/index'

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

interface ElementColour {
    text: string
    background: string
    border?: string
}

interface ComponentDefinition {
    id: string
    name: string
    base: string
    colour: ElementColour,
    noSpeciesLocation?: boolean
}

//==============================================================================

const FLOW_COLOUR: ElementColour = {
    text: '#00B050',
    background: '#E2F0D9'
}

const POTENTIAL_COLOUR: ElementColour = {
    text: '#FF0909',
    background: '#FBE4D5'
}

const POTENTIAL_STORAGE_COLOUR: ElementColour = {
    text: '#00B050',
    background: '#E2F0D9'
}

const KINETIC_STORAGE_COLOUR: ElementColour = {
    text: 'black',
    background: 'lightgrey'
}

const REACTION_COLOUR: ElementColour = {
    text: '#72329F',
    background: '#FFD966'
}

const RESISTANCE_COLOUR: ElementColour = {
    text: '#444',
    background: REACTION_COLOUR.background
}
const ONE_RESISTANCE_COLOUR: ElementColour = {
    text: RESISTANCE_COLOUR.text,
    background: RESISTANCE_COLOUR.background,
    border: 'green'
}

const SCALE_COLOUR: ElementColour = {
    text: '#7030A0',
    background: '#C1C1FA'
}

const UNITS_COLOUR: ElementColour = {
    text: '#444',
    background: '#DDD'
}

const ZERO_STORAGE_COLOUR: ElementColour = {
    text: FLOW_COLOUR.text,
    background: FLOW_COLOUR.background,
    border: 'red'
}

//==============================================================================

export const BONDGRAPH_ICON_DEFINITIONS: ComponentDefinition[] = [
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#ZeroStorageNode",
        name: "Zero storage node (q)",
        base: 'q',
        colour: ZERO_STORAGE_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#ZeroStorageNode",
        name: "Zero storage node (u)",
        base: 'u',
        colour: ZERO_STORAGE_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#OneResistanceNode",
        name: "One resistance node",
        base: 'v',
        colour: ONE_RESISTANCE_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#QuantityStore",
        name: "Static energy store",
        base: 'q',
        colour: POTENTIAL_STORAGE_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#ZeroNode",
        name: "Zero node",
        base: 'u',
        colour: POTENTIAL_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#OneNode",
        name: "One node",
        base: 'v',
        colour: FLOW_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#Dissipator",
        name: "Dissipative element",
        base: 'R',
        colour: RESISTANCE_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#ChemicalReaction",
        name: "Chemical reaction",
        base: 'Rx',
        colour: REACTION_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#TransformNode",
        name: "Transform node",
        base: 'k',
        colour: SCALE_COLOUR,
        noSpeciesLocation: true
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#FlowStore",
        name: "Dynamic energy store",
        base: 'L',
        colour: KINETIC_STORAGE_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#PotentialSource",
        name: "Potential source",
        base: 'u',
        colour: POTENTIAL_COLOUR
    },
    {
        id: "https://bg-rdf.org/ontologies/bondgraph-framework#FlowSource",
        name: "Flow source",
        base: 'v',
        colour: FLOW_COLOUR
    }
]

//==============================================================================

export function typeset(latex: string, colour: ElementColour, base64: boolean=false): string {
    const svg = LatexMathSvg.svgRect(latex, '', {
            'min-width': ICON_MIN_WIDTH,
            'min-height': ICON_MIN_HEIGHT,
            'vertical-align': ICON_VERTICAL_ALIGN,
            'border-width': colour.border ? ICON_BORDER : MIN_BORDER,
            padding: ICON_PADDING,
            'corner-radius': ICON_RADIUS,
            background: colour.background,
            border: colour.border || MIN_BORDER_COLOUR,
            'suffix-background': UNITS_COLOUR.background
        }
    )
    return base64 ? base64Svg(svg) : svg
}

export function definitionToLibraryTemplate(defn: ComponentDefinition): ComponentLibraryTemplate {
    const latex = defn.noSpeciesLocation ? defn.base : `${defn.base}^i_j`
    return Object.assign({}, defn, {
        image: typeset(latex, defn.colour, true)
    })
}

//==============================================================================
//==============================================================================
