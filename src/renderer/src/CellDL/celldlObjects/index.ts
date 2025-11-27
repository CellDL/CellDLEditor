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

import { Point, type PointLike } from '@renderer/common/points'
import type { PropertiesType, StringProperties } from '@renderer/common/types'

import { notifyChanges } from '@editor/editor/index'
import { alert } from '@editor/editor/alerts'
import { editGuides } from '@editor/editor/editguides'
import { type UndoMovePosition } from '@editor/editor/undoredo'

import { BoundedElement } from '@editor/SVGElements/boundedelement'
import { OBJECT_METADATA, type ObjectTemplate } from '@editor/components/index'
import { type ConnectionStyle } from '@editor/connections/index'
import { type CellDLDiagram } from '@editor/diagram/index'
import { SvgConnection } from '@editor/SVGElements/svgconnection'
import { type CellDLSVGElement } from '@editor/SVGElements/index'
import { pluginComponents } from '@editor/plugins/index'

import * as $rdf from '@editor/metadata/index'
import type { MetadataPropertiesMap, MetadataPropertyValue, NamedNode, RdfStore } from '@editor/metadata/index'
import { CELLDL, RDFS, RDF_TYPE } from '@editor/metadata/index'

//==============================================================================

export enum CELLDL_CLASS {
    Annotation = 'celldl-Annotation',
    Component = 'celldl-Component',
    Connector = 'celldl-Connector',
    Connection = 'celldl-Connection',
    Conduit = 'celldl-Conduit',
    Compartment = 'celldl-Compartment',
    Interface = 'celldl-InterfacePort',
    Layer = 'celldl-Layer',
    UnconnectedPort = 'celldl-Unconnected',
    Unknown = ''
}

//==============================================================================

/*
class BranchPoint implements PointLike {
    x: number = 0.0
    y: number = 0.0
    #connection: CellDLConnection

    // should we not pass in position/offset in range (0.0, 1.0)?
    // and have a separate `setLocation()`??
    constructor(connection: CellDLConnection, x: number, y: number)
    {
        this.#connection = connection
        this.x = x
        this.y = y
    }
}
*/

//==============================================================================

export class CellDLObject {
    static celldlClassName = CELLDL_CLASS.Unknown
    static celldlType = CELLDL('Object')

    #celldlClassName: CELLDL_CLASS
    #celldlDiagram: CellDLDiagram
    #celldlSvgElement: CellDLSVGElement | null = null
    #celldlType: NamedNode

    #label: string | null = null
    #moveable: boolean = false

    #metadataProperties!: MetadataPropertiesMap

    #template!: ObjectTemplate

    #children: Map<string, CellDLObject> = new Map()
    #parents: Map<string, CellDLObject> = new Map()

    #pluginData: Map<string, Object> = new Map()

    constructor(
        public readonly uri: NamedNode,
        metadata: MetadataPropertiesMap,
        readonly options: PropertiesType = {},
        celldlDiagram: CellDLDiagram
    ) {
        this.#celldlDiagram = celldlDiagram
        // @ts-expect-error: celldlClassName is a member of the object's constructor
        this.#celldlClassName = this.constructor.celldlClassName
        // @ts-expect-error: celldlType is a member of the object's constructor
        this.#celldlType = this.constructor.celldlType
        this.#setMetadataProperties(metadata)
        for (const pluginId of pluginComponents.registeredPlugins) {
            this.#pluginData.set(pluginId, {})
        }
    }

    static objectFromTemplate(uri: NamedNode, template: ObjectTemplate, celldlDiagram: CellDLDiagram): CellDLObject {
        const object = new template.CellDLClass(uri, template.metadataProperties, {}, celldlDiagram)
        object.#template = template
        return object
    }

    toString(): string {
        return `${this.#celldlClassName} ${this.id}`
    }

    get celldlClassName() {
        return this.#celldlClassName
    }

    get celldlDiagram() {
        return this.#celldlDiagram
    }

    get celldlSvgElement() {
        return this.#celldlSvgElement
    }
    setCelldlSvgElement(celldlSvgElement: CellDLSVGElement) {
        this.#celldlSvgElement = celldlSvgElement
    }

    get hasEditGuides() {
        return false
    }

    get id(): string {
        return this.uri.id()
    }

    isA(rdfType: NamedNode) {
        return this.#celldlType.equals(rdfType) || this.#metadataProperties.isA(rdfType)
    }

    get isAlignable() {
        return true
    }

    get isAnnotation() {
        return this.celldlClassName === CELLDL_CLASS.Annotation
    }

    get isComponent() {
        // Conduits are a component sub-class
        return this.celldlClassName === CELLDL_CLASS.Component || this.celldlClassName === CELLDL_CLASS.Conduit
    }

    get isConduit() {
        return this.celldlClassName === CELLDL_CLASS.Conduit
    }

    get isConnectable() {
        return false
    }

    get isConnection() {
        return this.celldlClassName === CELLDL_CLASS.Connection
    }

    get isCompartment() {
        return this.celldlClassName === CELLDL_CLASS.Compartment
    }

    get isInterface() {
        return this.celldlClassName === CELLDL_CLASS.Interface
    }

    get label() {
        return this.#label
    }

    get template() {
        return this.#template
    }

    attach(parent: CellDLObject) {
        this.#parents.set(parent.id, parent)
        parent.#children.set(this.id, this)
    }

    // Additional metadata about sub-classed instances
    get metadataProperties() {
        return this.#metadataProperties
    }

    get moveable() {
        return this.#moveable
    }

    get selected() {
        return this.#celldlSvgElement!.selected
    }

    get svgElement() {
        return this.#celldlSvgElement?.svgElement || null
    }

    pluginData(pluginId: string): Object {
        return this.#pluginData.get(pluginId)!
    }

    setPluginData(pluginId: string, data: Object) {
        this.#pluginData.set(pluginId, data)
    }

    activate(active = true) {
        this.#celldlSvgElement?.activate(active)
    }

    containsPoint(point: PointLike): boolean {
        return this.#celldlSvgElement !== null && this.#celldlSvgElement.containsPoint(point)
    }

    initialiseMove(svgElement: SVGGraphicsElement) {
        this.#moveable = this.#celldlSvgElement!.isMoveable(svgElement)
        if (this.#moveable) {
            svgElement.style.setProperty('cursor', 'move')
        }
    }

    startMove(svgPoint: PointLike) {
        this.#celldlSvgElement!.startMove(svgPoint)
    }

    move(svgPoint: PointLike) {
        this.#celldlSvgElement!.move(svgPoint)
    }

    endMove() {
        this.#celldlSvgElement!.endMove()
    }

    finaliseMove() {
        this.#moveable = false
    }

    clearControlHandles() {
        this.#celldlSvgElement?.clearControlHandles()
    }

    drawControlHandles() {
        this.#celldlSvgElement?.drawControlHandles()
    }

    highlight(highlight = true) {
        this.#celldlSvgElement?.highlight(highlight)
    }

    undoControlMove(undoPosition: UndoMovePosition) {
        this.#celldlSvgElement!.undoControlMove(undoPosition)
    }

    redraw() {
        if (this.#celldlSvgElement) {
            this.#celldlSvgElement.redraw()
        }
    }

    select(selected = true) {
        this.#celldlSvgElement?.select(selected)
    }

    assignSvgElement(_svgElement: SVGGraphicsElement) {
    }

    #setMetadataProperties(properties: MetadataPropertiesMap) {
        // Create a new MetadataPropertiesMap rather than storing a reference
        const metadataProperties = properties.copy()
        metadataProperties.setProperty(RDF_TYPE, this.#celldlType, true)
        this.#metadataProperties = metadataProperties
        const label = properties.get(RDFS('label').value) || 0
        if ($rdf.isLiteral(label)) {
            // @ts-expect-error: label is a Literal
            this.#label = label.value
        }
    }
}

//==============================================================================

export class CellDLMoveableObject extends CellDLObject {
    startMove(svgPoint: PointLike) {
        editGuides.removeGuide(this)
        super.startMove(svgPoint)
    }

    move(svgPoint: PointLike) {
        super.move(svgPoint)
        editGuides.matchGuide(this) // Highliglight guides that our centroid's now on
    }

    endMove() {
        super.endMove()
        editGuides.addGuide(this)
    }

    redraw() {
        editGuides.removeGuide(this)
        super.redraw()
        editGuides.addGuide(this)
    }

    assignSvgElement(svgElement: SVGGraphicsElement) {
        new BoundedElement(this, svgElement, this.isAlignable)
    }
}

//==============================================================================

export class CellDLAnnotation extends CellDLMoveableObject {
    static celldlClassName = CELLDL_CLASS.Annotation
    static celldlType = CELLDL('Annotation')

    get hasEditGuides() {
        return true
    }
}

//==============================================================================

export class CellDLConnectedObject extends CellDLMoveableObject {
    static celldlType = CELLDL('Connector')

    #connections: Map<string, CellDLConnection> = new Map()

    toString(): string {
        return `${super.toString()}  Connections: ${[...this.#connections.keys()].join(', ')}`
    }

    get connections(): CellDLConnection[] {
        return [...this.#connections.values()]
    }

    get isConnectable() {
        return true
    }

    get maxConnections(): number {
        return this.template?.maxConnections || Infinity
    }

    get numConnections(): number {
        return this.#connections.size
    }

    getConnection(id: string): CellDLConnection | null {
        return this.#connections.get(id) || null
    }

    addConnection(connection: CellDLConnection) {
        if (this.numConnections < this.maxConnections) {
            this.#connections.set(connection.id, connection)
        } else {
            alert.elementError(
                `${this.id}: Cannot add ${connection.id} --  connection limit reached`,
                this.celldlSvgElement ? this.celldlSvgElement.svgElement : undefined
            )
        }
    }

    deleteConnection(connection: CellDLConnection) {
        this.#connections.delete(connection.id)
    }

    redraw() {
        super.redraw()
        // Redraw connections that depend on our position
        this.#connections.forEach((cn) => cn.redraw())
    }
}

//==============================================================================

export class CellDLComponent extends CellDLConnectedObject {
    static celldlClassName = CELLDL_CLASS.Component
    static celldlType = CELLDL('Component')

    get hasEditGuides() {
        return true
    }
}

//==============================================================================

export class CellDLConduit extends CellDLComponent {
    static readonly celldlClassName = CELLDL_CLASS.Conduit
    static celldlType = CELLDL('Conduit')
}

//==============================================================================

export class CellDLCompartment extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.Compartment
    static celldlType = CELLDL('Compartment')

    #interfacePorts: CellDLInterface[] = []

    constructor(
        uri: NamedNode,
        metadata: MetadataPropertiesMap,
        options: PropertiesType = {},
        celldlDiagram: CellDLDiagram
    ) {
        super(uri, metadata, options, celldlDiagram)
        this.#interfacePorts = metadata
            .getPropertyAsArray(CELLDL('hasInterface'))
            .map((node) => <CellDLInterface>celldlDiagram.getConnector(node))
            .filter((node) => node != null)
            .map((node) => node!)
    }

    toString(): string {
        return `${super.toString()}  Ports: ${this.#interfacePorts.map((c) => c.id).join(', ')}`
    }

    get interfacePorts() {
        return this.#interfacePorts
    }

    get isAlignable() {
        return false
    }

    startMove(svgPoint: PointLike) {
        super.startMove(svgPoint)
    }

    move(svgPoint: PointLike) {
        super.move(svgPoint)
        // A move of the compartment moves the end of outgoing connections.
        for (const port of this.#interfacePorts) {
            port.move(svgPoint)
        }
    }

    endMove() {
        super.endMove()
        for (const port of this.#interfacePorts) {
            port.endMove()
        }
    }
}

//==============================================================================

export class CellDLConnection extends CellDLObject {
    static readonly celldlClassName = CELLDL_CLASS.Connection
    static celldlType = CELLDL('Connection')

    #connectedObjects: CellDLConnectedObject[] = []

    constructor(
        uri: NamedNode,
        metadata: MetadataPropertiesMap,
        options: PropertiesType = {},
        celldlDiagram: CellDLDiagram
    ) {
        super(uri, metadata, options, celldlDiagram)
// Also from plugin ?
// bgf:hasSource rdfs:subPropertyOf celldl:hasSource

        const source = celldlDiagram.getConnector(metadata.getProperty(CELLDL('hasSource')))
        const target = celldlDiagram.getConnector(metadata.getProperty(CELLDL('hasTarget')))
        const intermediates: CellDLConnectedObject[] = metadata
            .getPropertyAsArray(CELLDL('hasIntermediate'))
            .map((node) => celldlDiagram.getConnector(node))
            .filter((node) => node != null)
            .map((node) => node!)
        if (source && target) {
            this.#connectedObjects = [source, ...intermediates, target]
            for (const connector of this.#connectedObjects) {
                connector.addConnection(this)
            }
        } else {
            alert.elementError(
                `Connection ${this.id} has no source and/or target...`,
                this.celldlSvgElement ? this.celldlSvgElement.svgElement : undefined
            )
        }
    }

    toString(): string {
        return `${super.toString()}  Connecting: ${this.#connectedObjects.map((c) => c.id).join(', ')}`
    }

    get connectedObjects() {
        return this.#connectedObjects
    }

    get intermediates(): CellDLConnectedObject[] {
        return this.#connectedObjects.slice(1, -1)
    }

    get isAlignable() {
        return false
    }

    get source(): CellDLConnectedObject | null {
        return this.#connectedObjects[0] || null
    }

    get target(): CellDLConnectedObject | null {
        return this.#connectedObjects.length > 1 ? this.#connectedObjects.at(-1) : null
    }

    assignSvgElement(svgElement: SVGGraphicsElement) {
        new SvgConnection(this, svgElement, this.options.style as ConnectionStyle)
    }
}

//==============================================================================

export class CellDLInterface extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.Interface
    static celldlType = CELLDL('Interface')

    #externalConnections: CellDLConnection[] = []

    toString(): string {
        return `${super.toString()}  External: ${this.#externalConnections.map((c) => c.id).join(', ')}`
    }

    get externalConnections(): CellDLConnection[] {
        return this.#externalConnections
    }

    get isAlignable() {
        return false
    }

    addExternalConnection(connection: CellDLConnection) {
        this.#externalConnections.push(connection)
    }

    move(_svgPoint: PointLike) {
        const component = <BoundedElement>this.celldlSvgElement!
        const svgElement = <SVGGraphicsElement>this.celldlDiagram!.svgDiagram.getElementById(component.id)
        const bounds = svgElement.getBoundingClientRect()
        const centre = new Point((bounds.left + bounds.right) / 2, (bounds.top + bounds.bottom) / 2)
        const centroid = Point.fromPoint(this.celldlDiagram!.domToSvgCoords(centre))
        const savedCentroid = component.centroid
        component.setCentroid(centroid)
        component.unlimitDirection()
        const centroidDelta = component.centroid.subtract(savedCentroid)
        for (const connection of this.#externalConnections) {
            for (const path of (<SvgConnection>connection.celldlSvgElement).pathElements) {
                path.componentBoundingBoxMoved(component, centroidDelta)
            }
            connection.redraw()
        }
    }

    endMove() {
        for (const connection of this.#externalConnections) {
            for (const path of (<SvgConnection>connection.celldlSvgElement).pathElements) {
                path.endMove()
            }
        }
    }
}

//==============================================================================

export class CellDLUnconnectedPort extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.UnconnectedPort
    static celldlType = CELLDL('UnconnectedPort')
}

//==============================================================================
//==============================================================================
