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

import * as $rdf from '@editor/metadata'
import { TurtleContentType } from '@editor/metadata'
import type { ContentType, SubjectType } from '@editor/metadata'
import { SVG_NAMESPACE_URI } from '@renderer/common/svgUtils'

//==============================================================================

import {
    MetadataPropertiesMap,
    type MetadataPropertyValue,
    type NamedNode,
    RdfStore,
    type Statement
} from '@editor/metadata'
import { CELLDL_NAMESPACE, CELLDL_NAMESPACE_DECLARATIONS } from '@editor/metadata'
import { DCT_NAMESPACE, OWL_NAMESPACE, RDF_TYPE } from '@editor/metadata'

import { type PointLike } from '@renderer/common/points'
import { CELLDL_BACKGROUND_CLASS, CellDLStylesheet } from '@renderer/common/styling'
import { svgCircleElement, svgRectElement } from '@renderer/common/svgUtils'
import { type Bounds, type Extent } from '@editor/geometry'
import { ShapeIntersections } from '@editor/geometry/intersections'
import { CellDLSpatialIndex } from '@editor/geometry/spatialindex'
import type { ContainedObject } from '@editor/geometry/spatialindex'
import { lengthToPixels } from '@editor/geometry/units'
import { type FoundPoint, PointFinder } from '@editor/geometry/pathutils'

import { CELLDL_CLASS, CellDLObject } from '@editor/celldlObjects'
import {
    type CellDLConnectedObject,
    CellDLConnection,
    CellDLInterface,
    CellDLUnconnectedPort
} from '@editor/celldlObjects/index.ts'
import { CellDLAnnotation, CellDLComponent, CellDLConduit, CellDLCompartment } from '@editor/celldlObjects'
import { setInternalIds } from '@editor/SVGElements'
import type { BoundedElement } from '@editor/SVGElements/boundedelement'
import type { SvgConnection } from '@editor/SVGElements/svgconnection'

import { type CellDLEditor, notifyChanges } from '@editor/editor'
import { editGuides } from '@editor/editor/editguides'
import { type EditorUndoAction, undoRedo } from '@editor/editor/undoredo'

import { libraryManager } from '@editor/libraries'
import type { NewObjectClass, ObjectTemplate } from '@editor/components'
import { LatexStyleRules } from '@editor/mathjax'

import type { Constructor, StringProperties } from '@renderer/common/types'

//==============================================================================

export const CELLDL_VERSION = '1.0'

//==============================================================================

export const DiagramProperties = {
    author: DCT_NAMESPACE('creator'),
    created: DCT_NAMESPACE('created'),
    description: DCT_NAMESPACE('description'),
    modified: DCT_NAMESPACE('modified'),
    title: DCT_NAMESPACE('title'),
    celldlVersion: OWL_NAMESPACE('versionInfo')
}

//==============================================================================

const NEW_DIAGRAM_URI = 'file:///tmp/new_file.celldl'

//==============================================================================

const CELLDL_DEFINITIONS_ID = 'celldl-svg-definitions'
const CELLDL_METADATA_ID = 'celldl-rdf-metadata'
const CELLDL_STYLESHEET_ID = 'celldl-svg-stylesheet'

const DIAGRAM_MARGIN = 20

//==============================================================================

const CELLDL_DIAGRAM_ID = 'celldl-diagram-layer'

const ID_PREFIX = 'ID-'

//==============================================================================

export class CellDLDiagram {
    #svgDiagram!: SVGSVGElement

    #kb: RdfStore
    #celldlEditor: CellDLEditor
    #filePath: string
    #diagramProperties: StringProperties = {}

    #currentLayer: SVGGElement | null = null
    #imported: boolean
    #lastIdentifier: number = 0
    #layers: Map<string, SVGGElement> = new Map()
    #objects: Map<string, CellDLObject> = new Map()
    #orderedLayerIds: string[] = []
    #spatialIndex = new CellDLSpatialIndex()

    constructor(filePath: string, celldlData: string, celldlEditor: CellDLEditor, importSvg: boolean = false) {
        this.#filePath = filePath
        this.#celldlEditor = celldlEditor
        this.#imported = importSvg
        if (this.#filePath !== '') {
            let documentUri = encodeURI(this.#filePath)
            if (
                !documentUri.startsWith('file:') &&
                !documentUri.startsWith('http:') &&
                !documentUri.startsWith('https:')
            ) {
                documentUri = `file://${documentUri}`
            }
            this.#kb = new RdfStore(documentUri)
            this.#loadCellDL(celldlData)
            this.#loadMetadata()
        } else {
            this.#kb = new RdfStore(NEW_DIAGRAM_URI)
            if (importSvg) {
                this.#importSvg(celldlData)
            } else {
                this.#newDiagram()
            }
            this.#initaliseMetadata()
        }
        this.#setLastIdentifier()
        this.#setupDefines()
        this.#setStylesheet()
    }

    finishSetup() {
        // Called when the loaded diagram has been drawn as SVG
        this.#loadComponents()
        this.#loadInterfaces()
        this.#loadConduits()
        this.#loadConnections()
        this.#loadAnnotations()
        this.#loadObjectProperties()
        if (this.#imported) {
            // We want the file to be flagged as modified
            notifyChanges()
        }
    }

    edit() {
        this.#celldlEditor.editDiagram(this)
    }

    get editorFrame() {
        return this.#celldlEditor.editorFrame
    }

    get metadata(): StringProperties {
        return Object.keys(this.#diagramProperties)
            .filter((key) => key in DiagramProperties)
            .reduce((obj: Record<string, any>, key: string) => {
                obj[key] = this.#diagramProperties[key]
                return obj
            }, {})
    }
    set metadata(data: StringProperties) {
        Object.keys(data)
            .filter((key) => key in DiagramProperties)
            .map((key) => {
                // @ts-expect-error: `key` is a valid key for `data`
                this.#diagramProperties[key] = data[key]
            })
        notifyChanges()
    }

    get svgDiagram() {
        return this.#svgDiagram
    }

    domToSvgCoords(domCoords: PointLike): DOMPoint {
        // Transform from screen coordinates to SVG coordinates
        const dom_to_svg_transform: DOMMatrix | undefined = this.#svgDiagram?.getScreenCTM()?.inverse()
        return DOMPoint.fromPoint(domCoords).matrixTransform(dom_to_svg_transform)
    }

    svgToDomCoords(svgCoords: PointLike): DOMPoint {
        // Transform from SVG coordinates to screen coordinates
        const svg_to_dom_transform: DOMMatrix | undefined = this.#svgDiagram?.getScreenCTM() as DOMMatrix
        return DOMPoint.fromPoint(svgCoords).matrixTransform(svg_to_dom_transform)
    }

    makeUri(id: string): NamedNode {
        return this.#kb.documentNS(id)
    }

    #nextIdentifier(): string {
        this.#lastIdentifier += 1
        return `${ID_PREFIX}${this.#lastIdentifier.toString().padStart(8, '0')}`
    }

    removeKnowledge(subject: NamedNode, predicates: NamedNode[]) {
        for (const predicate of predicates) {
            for (const stmt of this.#kb.statementsMatching(subject, predicate, null)) {
                if ($rdf.isBlankNode(stmt.object)) {
                    this.#kb.removeStatements(stmt.object, null, null)
                }
            }
            this.#kb.removeStatements(subject, predicate, null)
        }
    }

    #loadDiagramProperties() {
        for (const [key, property] of Object.entries(DiagramProperties)) {
            for (const stmt of this.#kb.statementsMatching(this.#kb.documentNode, property, null)) {
                this.#diagramProperties[key] = stmt.object.value
                break
            }
        }
    }

    #saveDiagramProperties() {
        if (!('created' in this.#diagramProperties)) {
            this.#diagramProperties['created'] = new Date(Date.now()).toISOString()
        } else {
            this.#diagramProperties['modified'] = new Date(Date.now()).toISOString()
        }
        for (const [key, property] of Object.entries(DiagramProperties)) {
            this.#kb.removeStatements(this.#kb.documentNode, property, null)
            if (key in this.#diagramProperties) {
                const value = this.#diagramProperties[key]
                if (value) {
                    this.#kb.add(this.#kb.documentNode, property, $rdf.literal(value))
                }
            }
        }
    }

    #setLastIdentifier() {
        for (const element of this.#svgDiagram.querySelectorAll(`[id]`)) {
            if (element.id.startsWith(ID_PREFIX)) {
                const parts = element.id.substring(ID_PREFIX.length).split('-')
                if (parts.length) {
                    // @ts-expect-error: `parts` is at least one long
                    const lastIdentifier = +parts[0]
                    if (lastIdentifier > this.#lastIdentifier) {
                        this.#lastIdentifier = lastIdentifier
                    }
                }
            }
        }
    }

    #setupDefines() {
        // Make sure there is a <defs> and it has a arrow markers for connections
        // (and also a `free-end-connector` ??)
        let defsElement = this.#svgDiagram.getElementById(CELLDL_DEFINITIONS_ID)
        if (defsElement === null) {
            this.#svgDiagram.insertAdjacentHTML('afterbegin', `<defs></defs>`)
            defsElement = this.#svgDiagram.firstChild as SVGDefsElement
            defsElement.id = CELLDL_DEFINITIONS_ID
            for (const definitions of libraryManager.librarySvgDefinitions()) {
                defsElement.insertAdjacentHTML('afterbegin', definitions)
            }
        }
    }

    #setStylesheet() {
        const css = `${LatexStyleRules}${CellDLStylesheet}${libraryManager.libraryStyleRules()}`
        let styleElement = this.#svgDiagram.querySelector(
            `defs#${CELLDL_DEFINITIONS_ID} > style#${CELLDL_STYLESHEET_ID}`
        )
        if (styleElement === null) {
            const defsElement = this.#svgDiagram.getElementById(CELLDL_DEFINITIONS_ID)
            styleElement = document.createElementNS(SVG_NAMESPACE_URI, 'style')
            styleElement.id = CELLDL_STYLESHEET_ID
            defsElement!.prepend(styleElement)
            styleElement.textContent = css
        }
    }

    objectById(id: string): CellDLObject | null {
        return this.#objects.get(id) || null
    }

    #saveMetadata(svgDiagram: SVGSVGElement, metadata: string) {
        let metadataElement = svgDiagram.getElementById(CELLDL_METADATA_ID) as SVGMetadataElement
        if (metadataElement === null) {
            svgDiagram.insertAdjacentHTML('afterbegin', `<metadata id="${CELLDL_METADATA_ID}"></metadata>`)
            metadataElement = svgDiagram.getElementById(CELLDL_METADATA_ID) as SVGMetadataElement
        }
        const parser = new DOMParser()
        const xmlDocument = parser.parseFromString('<xml></xml>', 'application/xml')
        const metadataContent = xmlDocument.createCDATASection(metadata)
        metadataElement.replaceChildren(metadataContent)
        metadataElement.dataset.contentType = TurtleContentType
    }

    #importSvg(svgData: string) {
        this.#loadSvgDiagram(svgData)

        // Put all existing content into group with class of CELLDL_BACKGROUND_CLASS
        let backgroundGroup: SVGGraphicsElement | null | undefined
        const backgroundElements: SVGGraphicsElement[] = []
        for (const child of this.#svgDiagram.children) {
            if (child.tagName !== 'defs') {
                backgroundElements.push(child as SVGGraphicsElement)
                if (child.tagName === 'g' && backgroundGroup === undefined) {
                    backgroundGroup = child as SVGGraphicsElement
                } else {
                    backgroundGroup = null
                }
            }
        }
        if (!backgroundGroup) {
            backgroundGroup = document.createElementNS(SVG_NAMESPACE_URI, 'g')
            this.#svgDiagram.appendChild(backgroundGroup)
            for (const child of backgroundElements) {
                backgroundGroup.appendChild(child)
            }
        }
        backgroundGroup.setAttribute('class', CELLDL_BACKGROUND_CLASS)

        this.#setLayer(CELLDL_DIAGRAM_ID)
    }

    #loadCellDL(celldlData: string) {
        this.#loadSvgDiagram(celldlData)
        this.#findLayers()
        this.#setLayer(CELLDL_DIAGRAM_ID)
    }

    #loadSvgDiagram(svgData: string) {
        const parser = new DOMParser()
        const svgDocument = parser.parseFromString(svgData, 'image/svg+xml')
        const svgDiagram = <SVGSVGElement>svgDocument.firstElementChild
        if (svgDiagram.hasAttribute('width') && svgDiagram.hasAttribute('height')) {
            const width = lengthToPixels(<string>svgDiagram.getAttribute('width'))
            const height = lengthToPixels(<string>svgDiagram.getAttribute('height'))
            if (width !== null && height !== null) {
                svgDiagram.attributes.removeNamedItem('width')
                svgDiagram.attributes.removeNamedItem('height')
                if (!svgDiagram.hasAttribute('viewBox')) {
                    svgDiagram.setAttribute('viewBox', `0 0 ${width} ${height}`)
                }
            }
        }
        this.#svgDiagram = svgDiagram
    }

    #newDiagram() {
        const windowSize = this.#celldlEditor.windowSize
        const svgDiagram = document.createElementNS(SVG_NAMESPACE_URI, 'svg')
        svgDiagram.setAttribute('viewBox', `0 0 ${windowSize[0]} ${windowSize[1]}`)
        this.#svgDiagram = svgDiagram
        this.#setLayer(CELLDL_DIAGRAM_ID)
    }

    #setLayer(layerId: string) {
        let newLayer = <SVGGElement>this.#svgDiagram.querySelector(`svg > g.${CELLDL_CLASS.Layer}[id="${layerId}"]`)
        if (newLayer === null) {
            newLayer = document.createElementNS(SVG_NAMESPACE_URI, 'g')
            newLayer.id = layerId
            newLayer.setAttribute('class', CELLDL_CLASS.Layer)
            this.#svgDiagram.appendChild(newLayer)
            this.#layers.set(layerId, newLayer)
            this.#orderedLayerIds.push(layerId)
        }
        return (this.#currentLayer = newLayer)
    }

    #findLayers() {
        for (const layer of this.#svgDiagram.querySelectorAll(`g.${CELLDL_CLASS.Layer}[id]`)) {
            this.#layers.set(layer.id, <SVGGElement>layer)
            this.#orderedLayerIds.push(layer.id)
        }
    }

    #initaliseMetadata() {
        this.#kb.add(this.#kb.documentNode, RDF_TYPE, CELLDL_NAMESPACE('Document'))
        this.#diagramProperties['celldlVersion'] = CELLDL_VERSION
    }

    #loadMetadata() {
        const metadataElement = this.#svgDiagram.getElementById(CELLDL_METADATA_ID) as SVGMetadataElement
        if (
            metadataElement &&
            (!('contentType' in metadataElement.dataset) || metadataElement.dataset.contentType === TurtleContentType)
        ) {
            for (const childNode of metadataElement.childNodes) {
                if (childNode.nodeName === '#cdata-section') {
                    try {
                        this.#kb.load((<CDATASection>childNode).data, TurtleContentType)
                    } catch (err) {
                        console.error(err)
                    }
                    break
                }
            }
        }
        if (!this.#kb.contains(this.#kb.documentNode, RDF_TYPE, CELLDL_NAMESPACE('Document'))) {
            throw new Error(`${this.#filePath} metadata doesn't describe a valid CellDL document`)
        }
        this.#loadDiagramProperties()
        if ('celldlVersion' in this.#diagramProperties) {
            if (this.#diagramProperties['celldlVersion'] !== CELLDL_VERSION) {
                throw new Error(
                    `${this.#filePath} metadata version ${this.#diagramProperties['celldlVersion']} is not compatible with editor`
                )
            }
        } else {
            this.#diagramProperties['celldlVersion'] = CELLDL_VERSION
        }
    }

    #trimSVGDiagram(svgDiagram: SVGSVGElement): Extent | null {
        const bounds = (<SVGGraphicsElement[]>(
            [...svgDiagram.children].filter(
                (child) => 'getBBox' in child && !child.classList.contains('editor-specific')
            )
        ))
            .map((child) => child.getBBox())
            .reduce(
                (bounds, bbox) => {
                    return bbox.width > 0 && bbox.height > 0
                        ? {
                              xMin: Math.min(bounds.xMin, bbox.x),
                              xMax: Math.max(bounds.xMax, bbox.x + bbox.width),
                              yMin: Math.min(bounds.yMin, bbox.y),
                              yMax: Math.max(bounds.yMax, bbox.y + bbox.height)
                          }
                        : bounds
                },
                {
                    xMin: Infinity,
                    xMax: -Infinity,
                    yMin: Infinity,
                    yMax: -Infinity
                }
            )
        const round10 = (x) => 10 * Math.round(x / 10)
        if (bounds.xMin < bounds.xMax && bounds.yMin < bounds.yMax) {
            return [
                round10(bounds.xMin - DIAGRAM_MARGIN),
                round10(bounds.yMin - DIAGRAM_MARGIN),
                round10(bounds.xMax - bounds.xMin + 2 * DIAGRAM_MARGIN),
                round10(bounds.yMax - bounds.yMin + 2 * DIAGRAM_MARGIN)
            ]
        }
        return null
    }

    export(format: string) {
        return {
            error: `Unsupported export format: ${format}`
        }
    }

    async serialise(_filePath: string): Promise<string> {
        if (this.#svgDiagram !== null) {
            // Remove active/selected class from elements
            this.#celldlEditor.resetObjectStates()
            // Clone our diagram and remove editor specific elements from the SVG
            const svgDiagram = this.#svgDiagram.cloneNode(true) as SVGSVGElement
            svgDiagram.removeAttribute('style')
            this.#removeEditorElements(svgDiagram)

            // Remove extraneous whitespace around the diagram
            const trimmedViewbox = this.#trimSVGDiagram(this.#svgDiagram)
            if (trimmedViewbox) {
                svgDiagram!.setAttribute('viewBox', trimmedViewbox.map((n) => String(n)).join(' '))
            }

            // Make sure metadata is up-to-date
            this.#saveDiagramProperties()
            this.#saveObjectProperties()

            // Serialise metadata as Turtle into CDATA section in <metadata> element
            const metadata: string = await this.#serialiseMetadata(TurtleContentType)
            if (metadata !== '') {
                this.#saveMetadata(svgDiagram, metadata)
            }
            const svgSerializer = new XMLSerializer()
            const svgData = svgSerializer.serializeToString(svgDiagram)
            return svgData
        }
        return ''
    }

    async #serialiseMetadata(metadataFormat: ContentType): Promise<string> {
        let metadata: string = ''
        try {
            metadata = await this.#kb.serialise(metadataFormat, CELLDL_NAMESPACE_DECLARATIONS)
        } catch (err) {
            console.log(err)
        }
        return metadata
    }

    #setUniqueId(svgElement: SVGGraphicsElement) {
        svgElement.id = this.#nextIdentifier()
        setInternalIds(svgElement)
    }

    addEditorElement(element: SVGElement, prepend = false) {
        if (prepend) {
            this.#svgDiagram.prepend(element)
        } else {
            this.#svgDiagram.append(element)
        }
        element.classList.add('editor-specific')
    }

    #removeEditorElements(svgDiagram: SVGSVGElement) {
        // We save matched elements as an array because ``getElementsByClassName()``
        // returns a live collection
        const editorSpecificElements = Array.from(svgDiagram.getElementsByClassName('editor-specific'))
        for (const element of editorSpecificElements) {
            element.remove()
        }
    }

    associatedObjects(object: CellDLObject): CellDLObject[] {
        const objects: CellDLObject[] = []
        for (const associated of this.#associatedObjects(object)) {
            if (associated && associated.svgElement) {
                objects.push(associated)
            }
        }
        return objects
    }

    #associatedObjects(object: CellDLObject | undefined): Set<CellDLObject> {
        let result: Set<CellDLObject> = new Set()
        if (object) {
            if (object.isConnection) {
                result = new Set((<CellDLConnection>object).connectedObjects)
            } else if (object.isConnectable) {
                const objects: CellDLObject[] = []
                for (const connection of (<CellDLConnectedObject>object).connections.values()) {
                    objects.push(connection)
                    const associatedObjects = this.#associatedObjects(connection)
                    objects.push(...associatedObjects)
                }
                result = new Set(objects)
                result.delete(object)
            }
        }
        return result
    }

    #addMoveableObject(object: CellDLObject) {
        this.#objects.set(object.id, object)
        this.#spatialIndex.add(object)
    }

    #addConnection(connection: CellDLConnection) {
        this.#objects.set(connection.id, connection)
    }

    addConnectedObject(svgElement: SVGGraphicsElement, template: ObjectTemplate): CellDLConnectedObject | null {
        const object = this.#addNewObject(svgElement, template) as CellDLConnectedObject
        if (object) {
            this.#addMoveableObject(object)
        }
        return object
    }

    addNewConnection(svgElement: SVGGraphicsElement, template: ObjectTemplate): CellDLConnection | null {
        return this.#addNewObject(svgElement, template) as CellDLConnection
    }

    createCompartment(bounds: Bounds, objects: CellDLObject[]): CellDLCompartment {
        // we could simply pass ids into #objects
        const compartmentGroup = document.createElementNS(SVG_NAMESPACE_URI, 'g')
        compartmentGroup.id = this.#nextIdentifier()
        const cornerPoints = bounds.asPoints()
        const compartmentRect = svgRectElement(cornerPoints[0], cornerPoints[1], { class: 'compartment' })
        const compartmentShape = new ShapeIntersections(compartmentRect)
        compartmentGroup.appendChild(compartmentRect)
        const objectIds = new Set(objects.map((obj) => obj.id))
        const interfacePorts: CellDLInterface[] = []
        for (const object of objects) {
            if (
                !object.isConnection ||
                objectIds.isSupersetOf(new Set((<CellDLConnection>object).connectedObjects.map((obj) => obj.id)))
            ) {
                // Component or connection all inside bounds
                compartmentGroup.appendChild(object.celldlSvgElement!.svgElement)
                if (!object.isConnection) {
                    this.#spatialIndex.remove(object)
                }
            } else {
                // Connection that crosses the compartment's boundary
                const connectionPorts = this.#addConnectionToCompartment(
                    compartmentGroup,
                    compartmentShape,
                    objectIds,
                    <CellDLConnection>object
                )
                interfacePorts.push(...connectionPorts)
            }
        }
        const compartment = this.#addNewObject(
            compartmentGroup,
            {
                CellDLClass: CellDLCompartment,
                uri: CellDLCompartment.rdfType.uri,
                metadataProperties: MetadataPropertiesMap.fromProperties([
                    [CELLDL_NAMESPACE('hasInterface'), interfacePorts.map((p) => p.uri)]
                ])
            },
            false
        ) as CellDLCompartment
        if (compartment) {
            this.#addMoveableObject(compartment)
        }
        return compartment
    }

    #createConnection(connectedObjects: CellDLConnectedObject[], svgElements: SVGGraphicsElement[]): CellDLConnection {
        let svgElement: SVGGraphicsElement
        if (svgElements.length === 0) {
            console.log('No SVG elements to connect...')
            debugger
        }
        if (svgElements.length > 1) {
            svgElement = document.createElementNS(SVG_NAMESPACE_URI, 'g')
            svgElement.classList.add(CELLDL_CLASS.Connection)
            svgElements.forEach((element) => element.classList.add('parent-id'))
            svgElements.forEach((element) => element.classList.remove('selected'))
            svgElements.forEach((element) => svgElement.appendChild(element))
        } else {
            svgElement = svgElements[0]
            svgElement.classList.remove('parent-id', 'selected')
        }
        if (!svgElement.hasAttribute('id')) {
            svgElement.setAttribute('id', this.#nextIdentifier())
        }
        // what ComponentPlugin was used to create the object?
        const metadataProperties = MetadataPropertiesMap.fromProperties([
            [CELLDL_NAMESPACE('hasSource'), connectedObjects[0].uri],
            [CELLDL_NAMESPACE('hasTarget'), connectedObjects[connectedObjects.length - 1].uri],
            [CELLDL_NAMESPACE('hasIntermediate'), connectedObjects.slice(1, -1).map((c) => c.uri)]
        ])
        const connection = this.#addNewObject(
            svgElement,
            {
                CellDLClass: CellDLConnection,
                uri: CellDLConnection.rdfType.uri,
                metadataProperties
            },
            false
        ) as CellDLConnection
        this.#addConnection(connection)
        return connection
    }

    #createPort<T extends CellDLConnectedObject>(newObjectClass: NewObjectClass, point: PointLike): T {
        const connector = this.#addNewObject(
            svgCircleElement(point, 0, { id: this.#nextIdentifier() }),
            Object.assign(
                {
                    metadataProperties: new MetadataPropertiesMap()
                },
                newObjectClass
            ),
            false
        ) as T
        this.#addMoveableObject(connector)
        return connector
    }

    createInterfacePort(point: PointLike): CellDLInterface {
        return this.#createPort<CellDLInterface>(
            {
                CellDLClass: CellDLInterface,
                uri: CellDLInterface.rdfType.uri
            },
            point
        )
    }

    createUnconnectedPort(point: PointLike): CellDLUnconnectedPort {
        return this.#createPort<CellDLUnconnectedPort>(
            {
                CellDLClass: CellDLUnconnectedPort,
                uri: CellDLUnconnectedPort.rdfType.uri
            },
            point
        )
    }

    #addConnectionToCompartment(
        compartmentGroup: SVGGElement,
        compartmentShape: ShapeIntersections,
        objectIds: Set<string>,
        connection: CellDLConnection
    ): CellDLInterface[] {
        // The connection might intersect the compartment's boundary multiple times, once
        // for each path element, resulting in multiple new connections, both inside and
        // outside of the new compartment. e.g:
        //
        //             =========================
        //            ||                       ||
        //            ||   +----R   R-----+    ||
        //             ====1====2===3=====4=====
        //                 |    R---+     |
        //                 |              |
        //                 A              B
        //
        //   Connection [A, R, R, R, B] would become:
        //
        //      [1, R, 2], [3, R, 4] inside
        //      [A, 1], [2, R, 3], [4, B] outside
        //
        //  and:
        //                 +-------K------+
        //                 R              R
        //                 |              |
        //             ====1==============2=====
        //            ||   |              |    ||
        //            ||   A              B    ||
        //             =========================
        //
        //   Connection [A, R, K, B] would become:
        //
        //      [A, 1], [2, B] inside
        //      [1, R, K, R, 2] outside
        //
        const interfacePorts: CellDLInterface[] = []
        const connectors = connection.connectedObjects
        const pathElements = (<SvgConnection>connection.celldlSvgElement!).pathElements
        const pathStart = connectors[0]
        const newConnectors: CellDLConnectedObject[] = []
        newConnectors.push(pathStart)
        const newElements: SVGPathElement[] = []

        // The connection will be split into several, so first remove the original one
        this.removeObject(connection)

        let currentPathInside = objectIds.has(pathStart.id)
        let pathEnd: CellDLConnectedObject
        for (let pathElementIndex = 0; pathElementIndex < pathElements.length; pathElementIndex += 1) {
            const pathElement = pathElements[pathElementIndex]
            pathEnd = connectors[pathElementIndex + 1]
            if (
                (currentPathInside && objectIds.has(pathEnd.id)) ||
                (!currentPathInside && !objectIds.has(pathEnd.id))
            ) {
                newConnectors.push(pathEnd)
                newElements.push(pathElement.svgElement)
                continue
            }
            const pathIntersections = compartmentShape.intersections(pathElement.svgElement)
            if (pathIntersections.length % 2 === 0) {
                console.warn(`Path unexpectedly intersects selection boundary...`)
            } else {
                let splitPoint: FoundPoint | null = null
                let closestOffset = currentPathInside ? -Infinity : Infinity
                const pointFinder = new PointFinder(pathElement.pathArray)
                // We use the pathElement's intersection which is closest to the inside end
                // for the new interface's location
                for (const point of pathIntersections) {
                    const foundPoint = pointFinder.findPoint(point)
                    if (
                        foundPoint.offset !== null &&
                        ((!currentPathInside && foundPoint.offset < closestOffset) ||
                            (currentPathInside && foundPoint.offset > closestOffset))
                    ) {
                        closestOffset = foundPoint.offset
                        splitPoint = foundPoint
                    }
                }
                if (splitPoint === null) {
                    console.warn(`Path unexpectedly doesn't intersect selection boundary...`)
                } else {
                    // Create an Interface at the split point
                    const interfacePort = this.createInterfacePort(splitPoint.point)
                    interfacePorts.push(interfacePort)
                    newConnectors.push(interfacePort)
                    const interfaceElement = <BoundedElement>interfacePort.celldlSvgElement!
                    compartmentGroup.appendChild(interfaceElement.svgElement)
                    const tailSvgElement = pathElement.splitPath(splitPoint, interfaceElement)
                    const headSvgElement = pathElement.svgElement.cloneNode(true) as SVGPathElement
                    headSvgElement.removeAttribute('id')
                    newElements.push(headSvgElement)
                    const newConnection = this.#createConnection(newConnectors, newElements)
                    this.#connectCompartmentConnection(newConnection, compartmentGroup, currentPathInside)
                    newConnectors.length = 0
                    newConnectors.push(interfacePort)
                    newConnectors.push(pathEnd)
                    newElements.length = 0
                    newElements.push(tailSvgElement)
                    currentPathInside = !currentPathInside
                }
            }
        }
        if (newConnectors.length) {
            // && newElements.length ?? Or newConnectors.length > 1
            const newConnection = this.#createConnection(newConnectors, newElements)
            this.#connectCompartmentConnection(newConnection, compartmentGroup, currentPathInside)
        }

        return interfacePorts
    }

    #connectCompartmentConnection(
        connection: CellDLConnection,
        compartmentGroup: SVGGElement,
        currentPathInside: boolean
    ) {
        if (currentPathInside) {
            compartmentGroup.appendChild(connection.celldlSvgElement!.svgElement)
        } else {
            if (connection.source!.isInterface) {
                ;(<CellDLInterface>connection.source!).addExternalConnection(connection)
            }
            if (connection.target!.isInterface) {
                ;(<CellDLInterface>connection.target!).addExternalConnection(connection)
            }
        }
    }

    updateObjectKnowledge(celldlObject: CellDLObject): Statement[] {
        return this.#kb.addMetadataPropertiesForSubject(celldlObject.uri, celldlObject.metadataProperties)
    }

    #loadObjectProperties() {
        for (const celldlObject of this.#objects.values()) {
            celldlObject.loadObjectProperties(this.#kb)
        }
    }

    #saveObjectProperties() {
        for (const celldlObject of this.#objects.values()) {
            celldlObject.saveObjectProperties(this.#kb)
        }
    }

    #addNewObject(svgElement: SVGGraphicsElement, template: ObjectTemplate, assignId = true) {
        const celldlClassName = template.CellDLClass.celldlClassName
        if (assignId) {
            this.#setUniqueId(svgElement)
        }
        svgElement.classList.add(celldlClassName)
        if (this.#currentLayer) {
            this.#currentLayer.appendChild(svgElement)
        }
        // This is where we create an instanced object of its template's class
        const celldlObject = CellDLObject.objectFromTemplate(this.makeUri(svgElement.id), template, this)
        const knowledge = this.updateObjectKnowledge(celldlObject)
        if (celldlObject.isConnection) {
            this.#addConnection(<CellDLConnection>celldlObject)
        }
        celldlObject.assignSvgElement(svgElement)
        const undoAction = undoRedo.undoInsertAction()
        undoAction.addObjectDetails(celldlObject)
        undoAction.addKnowledge(knowledge)
        return celldlObject
    }

    #setObjectSvgElement(celldlObject: CellDLObject): boolean {
        const svgElement = <SVGGraphicsElement>this.#svgDiagram.getElementById(celldlObject.id)
        if (svgElement) {
            celldlObject.assignSvgElement(svgElement) // this sets bounds and hence centre
            if (celldlObject.hasEditGuides) {
                editGuides.addGuide(<CellDLComponent>celldlObject)
            }
            return true
        }
        console.error(`Missing SVG element for ${celldlObject.id}`)
        return false
    }

    #celldlObjectFromRdf<T extends CellDLObject>(CellDLClass: Constructor<T>, subject: SubjectType, options = {}): T {
        const metadata = this.#kb.metadataPropertiesForSubject(subject)
        // need to call object from template...
        const celldlObject = new CellDLClass(subject, metadata, options, this)
        return celldlObject
    }

    #subjectsOfType(parentType: NamedNode): [SubjectType, NamedNode][] {
        return this.#kb.subjectsOfType(parentType).filter((st) => st[0].value.startsWith(this.#kb.documentUri))
    }

    #loadObject<T extends CellDLObject>(type: NamedNode, CellDLClass: Constructor<T>) {
        for (const subjectType of this.#subjectsOfType(type)) {
            if (subjectType[1].equals(type)) {
                const object = this.#celldlObjectFromRdf(CellDLClass, subjectType[0])
                if (this.#setObjectSvgElement(object)) {
                    this.#addMoveableObject(object)
                }
            }
        }
    }

    #loadAnnotations() {
        this.#loadObject(CELLDL_NAMESPACE('Annotation'), CellDLAnnotation)
    }

    #loadComponents() {
        this.#loadObject(CELLDL_NAMESPACE('Component'), CellDLComponent)
        this.#loadObject(CELLDL_NAMESPACE('UnconnectedPort'), CellDLUnconnectedPort)
    }

    #loadInterfaces() {
        this.#loadObject(CELLDL_NAMESPACE('Connector'), CellDLInterface)
    }

    #loadConduits() {
        this.#loadObject(CELLDL_NAMESPACE('Conduit'), CellDLConduit)
    }

    getConnector(connectorNode: MetadataPropertyValue | null): CellDLConnectedObject | null {
        if (connectorNode && $rdf.isNamedNode(connectorNode) && connectorNode.value.startsWith(this.#kb.documentUri)) {
            const connectorId = (<NamedNode>connectorNode).id()
            const connector = this.#objects.get(connectorId) as CellDLConnectedObject
            return connector && connector.isConnectable ? connector : null
        }
        return null
    }

    #loadConnections() {
        this.#loadObject(CELLDL_NAMESPACE('Connection'), CellDLConnection)
    }

    objectsContainedIn(compartment: Bounds): ContainedObject[] {
        return this.#spatialIndex.objectsContainedIn(compartment)
    }

    objectMoved(celldlObject: CellDLObject) {
        this.#spatialIndex.update(celldlObject)
    }

    deleteInsertedObject(undoAction: EditorUndoAction) {
        for (const objectDetails of [...undoAction.objectDetails].reverse()) {
            const celldlObject = objectDetails.object
            if (celldlObject.isComponent) {
                editGuides.removeGuide(<CellDLComponent>celldlObject)
            }
            celldlObject.celldlSvgElement!.remove() // Will remove SVG element from DOM
            const statements = this.#kb.statementsMatching(celldlObject.uri)
            this.#kb.removeStatementList(statements)
            this.#objects.delete(celldlObject.id)
        }
    }

    insertDeletedObject(undoAction: EditorUndoAction) {
        // Add back objects in reverse order, so last removed is first reinserted
        for (const objectDetails of [...undoAction.objectDetails].reverse()) {
            objectDetails.insertSvg(this.svgDiagram) // adds SVG element to DOM
            const celldlObject = objectDetails.object
            if (celldlObject.isComponent) {
                editGuides.addGuide(<CellDLComponent>celldlObject)
            }
            this.#objects.set(celldlObject.id, celldlObject)
        }
        this.#kb.addStatementList(undoAction.knowledge)
    }

    removeObject(celldlObject: CellDLObject) {
        if (this.#objects.has(celldlObject.id)) {
            const undoAction = undoRedo.undoDeleteAction()
            this.#removeObject(celldlObject, undoAction)
        }
    }

    #removeObject(celldlObject: CellDLObject, undoAction: EditorUndoAction) {
        undoAction.addObjectDetails(celldlObject)
        if (celldlObject.isComponent) {
            editGuides.removeGuide(<CellDLComponent>celldlObject)
        }
        celldlObject.celldlSvgElement!.remove() // Will remove SVG element from DOM
        const statements = this.#kb.statementsMatching(celldlObject.uri)
        undoAction.addKnowledge(statements)
        this.#kb.removeStatementList(statements)
        this.#objects.delete(celldlObject.id)
        this.#spatialIndex.remove(celldlObject)
        if (celldlObject.isConnectable) {
            const connector = <CellDLConnectedObject>celldlObject
            const connections = (<CellDLConnectedObject>celldlObject).connections
            for (const connection of connections) {
                this.#removeObject(connection, undoAction)
                connector.deleteConnection(connection)
            }
        }
        if (celldlObject.isConnection) {
            const connection = <CellDLConnection>celldlObject
            for (const connector of connection.connectedObjects) {
                connector.deleteConnection(connection)
            }
        }
    }
}

//==============================================================================
