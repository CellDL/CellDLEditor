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
import type { UndoMovePosition } from '@editor/editor/undoredo'

import { BoundedElement } from '@editor/SVGElements/boundedelement'
import type { ObjectTemplate } from '@editor/components/index'
import type { ConnectionStyle } from '@editor/connections/index'
import type { CellDLDiagram } from '@editor/diagram/index'
import { SvgConnection } from '@editor/SVGElements/svgconnection'
import type { CellDLSVGElement } from '@editor/SVGElements/index'

import * as $rdf from '@editor/metadata/index'
import type { MetadataPropertiesMap, MetadataPropertyValue, NamedNode, RdfStore } from '@editor/metadata/index'
import { CELLDL_NAMESPACE, DCT_NAMESPACE, RDFS_NAMESPACE, RDF_TYPE } from '@editor/metadata/index'

//==============================================================================

export const ObjectMetadataUris = [
    RDFS_NAMESPACE('label'),
    DCT_NAMESPACE('description')
]

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
    static rdfType = CELLDL_NAMESPACE('Object')

    #celldlClassName: CELLDL_CLASS
    #celldlDiagram: CellDLDiagram
    #celldlSvgElement: CellDLSVGElement | null = null
    #moveable: boolean = false

    #label: string | null = null
    #metadataProperties!: MetadataPropertiesMap
    #objectMetadata: StringProperties = {}
    #rdfType: NamedNode
    #template!: ObjectTemplate

    #children: Map<string, CellDLObject> = new Map()
    #parents: Map<string, CellDLObject> = new Map()

    constructor(
        public readonly uri: NamedNode,
        metadata: MetadataPropertiesMap,
        readonly options: PropertiesType = {},
        celldlDiagram: CellDLDiagram
    ) {
        this.#celldlDiagram = celldlDiagram
        // @ts-expect-error: celldlClassName is a member of the object's constructor
        this.#celldlClassName = this.constructor.celldlClassName
        // @ts-expect-error: rdfType is a member of the object's constructor
        this.#rdfType = this.constructor.rdfType
        this.#setMetadataProperties(metadata)
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
        return this.#rdfType.equals(rdfType) || this.#metadataProperties.isA(rdfType)
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

    // Metadata associated with the base CellDLObject instance
    get metadata(): StringProperties {
        const properties: StringProperties = {}
        for (const uri of ObjectMetadataUris) {
            if (uri.value in this.#objectMetadata) {
                // @ts-expect-error:
                properties[uri.value] = this.#objectMetadata[uri.value]
            }
        }
        return properties
    }

    set metadata(data: PropertiesType) {
        let changed = false
        for (const uri of ObjectMetadataUris) {
            if (uri.value in data) {
                const value = `${data[uri.value]}`.trim()
                if (value !== this.#objectMetadata[uri.value]) {
                    this.#objectMetadata[uri.value] = value
                    changed = true
                }
            }
        }
        if (changed) {
            notifyChanges()
        }
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

    loadObjectProperties(rdfStore: RdfStore) {
        for (const uri of ObjectMetadataUris) {
            for (const stmt of rdfStore.statementsMatching(this.uri, uri, null)) {
                this.#objectMetadata[uri.value] = stmt.object.value
                break
            }
        }
    }

    saveObjectProperties(rdfStore: RdfStore) {
        for (const uri of ObjectMetadataUris) {
            rdfStore.removeStatements(this.uri, uri, null)
            if (uri.value in this.#objectMetadata) {
                const value = this.#objectMetadata[uri.value]
                if (value) {
                    rdfStore.add(this.uri, uri, $rdf.literal(value))
                }
            }
        }
    }

    getMetadataProperty(predicate: NamedNode): MetadataPropertyValue | null {
        return this.#metadataProperties.getProperty(predicate)
    }

    #setMetadataProperties(properties: MetadataPropertiesMap) {
        // Create a new MetadataPropertiesMap rather than storing a reference
        const metadataProperties = properties.copy()
        metadataProperties.setProperty(RDF_TYPE, this.#rdfType, true)
        this.#metadataProperties = metadataProperties
        const label = properties.get(RDFS_NAMESPACE('label').uri) || 0
        if ($rdf.isLiteral(label)) {
            // @ts-expect-error: label is a Literal
            this.#label = label.value
        }
    }

    updateMetadataProperties(template: ObjectTemplate) {
        this.#setMetadataProperties(template.metadataProperties)
        // only if changes...
        notifyChanges()
        // Remove existing knowledge the diagram might have about the object
        this.#celldlDiagram.removeKnowledge(this.uri, template.rdfPredicates)
        // And add the object's updated knowledge to the diagram
        this.#celldlDiagram.updateObjectKnowledge(this)
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
    static rdfType = CELLDL_NAMESPACE('Annotation')

    get hasEditGuides() {
        return true
    }
}

//==============================================================================

export class CellDLConnectedObject extends CellDLMoveableObject {
    static rdfType = CELLDL_NAMESPACE('Connector')

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
    static rdfType = CELLDL_NAMESPACE('Component')

    get hasEditGuides() {
        return true
    }
}

//==============================================================================

export class CellDLConduit extends CellDLComponent {
    static readonly celldlClassName = CELLDL_CLASS.Conduit
    static rdfType = CELLDL_NAMESPACE('Conduit')
}

//==============================================================================

export class CellDLCompartment extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.Compartment
    static rdfType = CELLDL_NAMESPACE('Compartment')

    #interfacePorts: CellDLInterface[] = []

    constructor(
        uri: NamedNode,
        metadata: MetadataPropertiesMap,
        options: PropertiesType = {},
        celldlDiagram: CellDLDiagram
    ) {
        super(uri, metadata, options, celldlDiagram)
        this.#interfacePorts = metadata
            .getPropertyAsArray(CELLDL_NAMESPACE('hasInterface'))
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
    static rdfType = CELLDL_NAMESPACE('Connection')

    #connectedObjects: CellDLConnectedObject[] = []

    constructor(
        uri: NamedNode,
        metadata: MetadataPropertiesMap,
        options: PropertiesType = {},
        celldlDiagram: CellDLDiagram
    ) {
        super(uri, metadata, options, celldlDiagram)
        const source = celldlDiagram.getConnector(metadata.getProperty(CELLDL_NAMESPACE('hasSource')))
        const target = celldlDiagram.getConnector(metadata.getProperty(CELLDL_NAMESPACE('hasTarget')))
        const intermediates: CellDLConnectedObject[] = metadata
            .getPropertyAsArray(CELLDL_NAMESPACE('hasIntermediate'))
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
        return this.#connectedObjects.length ? this.#connectedObjects[0] : null
    }

    get target(): CellDLConnectedObject | null {
        return this.#connectedObjects.length > 1 ? this.#connectedObjects.slice(-1)[0] : null
    }

    assignSvgElement(svgElement: SVGGraphicsElement) {
        new SvgConnection(this, svgElement, this.options.style as ConnectionStyle)
    }
}

//==============================================================================

export class CellDLInterface extends CellDLConnectedObject {
    static readonly celldlClassName = CELLDL_CLASS.Interface
    static rdfType = CELLDL_NAMESPACE('Interface')

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
    static rdfType = CELLDL_NAMESPACE('UnconnectedPort')
}

//==============================================================================

export const rdfTypeToCellDLObject = new Map(
    [
        CellDLObject,
        CellDLAnnotation,
        CellDLComponent,
        CellDLConduit,
        CellDLConnectedObject,
        CellDLConnection,
        CellDLCompartment,
        CellDLInterface,
        CellDLUnconnectedPort
    ].map((c) => [c.rdfType.uri, c])
)

//==============================================================================
