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

import { EM_SIZE } from '../geometry/units.ts'

//==============================================================================

export const CONNECTION_ARROW_SIZE = [8, 8] // [W, H] pixels
export const CONNECTION_SPLAY_PADDING = 0.5 // If <= 1.0 then fraction of elements width and height else pixels
export const MAX_CONNECTION_SPLAY_PADDING = 40 // pixels
export const CONNECTION_WIDTH = 2 // pixels

export const INTERFACE_PORT_RADIUS = 4 // pixels
export const SELECTION_STROKE_WIDTH = 3 // pixels

//==============================================================================

export const CELLDL_BACKGROUND_CLASS = 'celldl-background'

//==============================================================================

export const EditorStylesheet = `
    svg {
        background-color: #EEE;
        user-select: none;
        /* Element states while editing */
        --active: #0F8;
        --highlighted: #05F;
        --selected: #0DF;
        --active-selected: #0FF;
        --connection-selected: #F00;
        --connection-highlighted: #0F8;
    }
    .${CELLDL_BACKGROUND_CLASS} {
        pointer-events: none;
    }
    .selection-element {
        fill: none;
        pointer-events: all;
        stroke-opacity: 0.8;
        stroke-width: ${SELECTION_STROKE_WIDTH};
        rx: 8px;
    }
    .control-rectangle.selected {
        fill: #f00;
        opacity: 0.4;
        stroke: #F0F;
        stroke-width: 3;
        pointer-events: all;
    }

    /* Alignment guides */
    .alignment-grid {
        stroke: #08F;
        stroke-width: 0.4;
        stroke-opacity: 0.3;
    }
    .alignment-guide {
        stroke: none;
    }
    .alignment-guide.visible {
        stroke: #08F;
        stroke-width: 1;
        stroke-opacity: 0.8;
    }

    /* Control points */
    .control-point {
        fill: #00C;
        opacity: 0.8;
        stroke: #00C;
        stroke-width: 2;
    }
    .control-point.fixed {
        fill: white;
    }
    #celldl-editor-selection-frame.highlight .control-point {
        stroke: #00F;
    }
    #celldl-editor-selection-frame.highlight .control-point.active {
        fill: #88F;
        opacity: 1.0;
    }

    /* Active, highlighted, and selected objects */
    .active:not(.celldl-Connection) {
        stroke: var(--active) !important;
    }
    .highlight:not(.celldl-Connection) {
        stroke: var(--highlighted) !important;
    }
    .selected:not(.celldl-Connection) {
        stroke: var(--selected) !important;
    }
    .active.selected:not(.celldl-Connection) {
        stroke: var(--active-selected) !important;
    }
    .selection-rect {
        fill: #ccc;
        fill-opacity: 0.2;
        stroke: black;
        stroke-width: 0.3;
        stroke-opacity: 0.4;
    }

    /* Components */
    .celldl-Component.editor {
        pointer-events: all;
    }

    /* Conduits */
    .selection-element.conduit {
        opacity: 0.5;
    }
    .active + .conduit {
        fill: var(--active);
    }
    .highlight + .conduit {
        fill: var(--highlighted);
    }
    .active.selected + .conduit {
        fill:  var(--active-selected) !important;
    }

    /* Interfaces */
    .celldl-InterfacePort .selection-element.selected {
        stroke: var(--connection-selected);
    }
    .celldl-InterfacePort.highlight {
        fill: var(--highlighted) !important;
    }

    /* Connections */
    .celldl-Connection .selection-element.highlight {
        stroke: var(--connection-highlighted) !important;
    }
    .celldl-Connection.active,
    .celldl-Connection.highlight,
    .celldl-Connection.selected {
        stroke-width: 4;
    }
    .celldl-Connection.active.selected {
        stroke-width: 5;
    }

    .error {
        colour: yellow;
        opacity: 1;
        stroke: yellow;
        stroke-opacity: 1;
    }
`

//==============================================================================

export function arrowMarkerDefinition(markerId: string, markerType: string): string {
    // see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
    const W = CONNECTION_WIDTH
    return `<marker id="${markerId}" viewBox="0 0 ${5.5 * W} ${5 * W}" class="${markerType}"
        refX="${5 * W}" refY="${2.5 * W}" orient="auto-start-reverse" markerUnits="userSpaceOnUse"
        markerWidth="${CONNECTION_ARROW_SIZE[0]}" markerHeight="${CONNECTION_ARROW_SIZE[1]}">
            <path fill="currentcolor" stroke="currentcolor" d="M0,0 L${5.05 * W},${2.2 * W} L${5.05 * W},${2.8 * W} L0,${5 * W} L${W},${2.5 * W} z" />
        </marker>`
}

//==============================================================================

export type GradientStop = {
    offset: string
    colour: string
}

export function gradientDefinition(type: string, gradientId: string, stops: GradientStop[]): string {
    return `<${type}Gradient id="${gradientId}">${stops
        .map((def) => `<stop offset="${def.offset}" stop-color="${def.colour}" />`)
        .join('\n    ')}</${type}Gradient>`
}

//==============================================================================

export const CellDLStylesheet = [
    `svg{font-size:${EM_SIZE}px}`,
    /* Conduits */
    '.celldl-Conduit{z-index:9999}',
    /* Connections */
    `.celldl-Connection{stroke-width:${CONNECTION_WIDTH};stroke-linecap:round;stroke-linejoin:round;opacity:0.7;fill:none;stroke:currentcolor}`,
    '.celldl-Connection.dashed{stroke-dasharray:5}',
    /* Compartments */
    '.celldl-Compartment>rect.compartment{fill:#CCC;opacity:0.6;stroke:#444;rx:10px;ry:10px}',
    /* Interfaces */
    `.celldl-InterfacePort{fill:red;r:${INTERFACE_PORT_RADIUS}px}`,
    `.celldl-Unconnected{fill:red;fill-opacity:0.1;stroke:red;r:${INTERFACE_PORT_RADIUS}px}`
].join('')

//==============================================================================
