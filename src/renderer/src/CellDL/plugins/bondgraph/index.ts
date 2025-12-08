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

import * as $oxigraph from '@oxigraph/web'
import { ucum } from '@atomic-ehr/ucum'

//==============================================================================

import { arrowMarkerDefinition } from '@renderer/common/styling'
import { type IUiJsonDiscreteInput } from '@renderer/libopencor/locUIJsonApi'

import { getSvgFillStyle, getSvgPathStyle, setSvgPathStyle, type IPathStyle } from '@renderer/common/svgUtils'

import { alert } from '@editor/editor/alerts'
import {
    CellDLComponent,
    CellDLConnection,
    CellDLObject
} from '@editor/celldlObjects/index'
import {
    type ComponentLibrary,
    type ElementIdName,
    type ObjectTemplate
} from '@editor/components/index'
import {
    getItemProperty,
    type ItemDetails,
    type PropertyGroup,
    type StyleObject,
    updateItemProperty,
    type ValueChange
} from '@editor/components/properties'
import * as $rdf from '@editor/metadata/index'
import { BGF, RDF, SPARQL_PREFIXES } from '@editor/metadata/index'
import { getCurie, type MetadataProperty, MetadataPropertiesMap, RdfStore } from '@editor/metadata/index'
import { pluginComponents, type PluginInterface } from '@editor/plugins/index'

import {
    type BGComponentLibraryTemplate,
    BONDGRAPH_ICON_DEFINITIONS,
    definitionToLibraryTemplate,
    svgImage
} from './icons'

//==============================================================================

const BONDGRAPH_FRAMEWORK = 'https://bg-rdf.org/ontologies/bondgraph-framework'

//==============================================================================

type BGComponentLibrary = ComponentLibrary & {
    components: BGComponentLibraryTemplate[]
}

export const BondgraphComponents: BGComponentLibrary = {
    name: 'Bondgraph Elements',
    components: BONDGRAPH_ICON_DEFINITIONS.map(defn => definitionToLibraryTemplate(defn))
}

const BondgraphComponentTemplates: Map<string, BGComponentLibraryTemplate> = new Map(
    BondgraphComponents.components.map((c: BGComponentLibraryTemplate) => [c.id, c])
)

//==============================================================================

export interface INodeStyle {
    gradientFill: boolean
    colours: string[]
    direction?: string
}

//==============================================================================

// Temp workaround until `import.meta.glob` is correctly configured...
// Files are in /public

import BG_RDF_ONTOLOGY from '/bg-rdf/ontology.ttl?url&raw'

import CHEMICAL_TEMPLATE from '/bg-rdf/templates/chemical.ttl?url&raw'
import ELECTRICAL_TEMPLATE from '/bg-rdf/templates/electrical.ttl?url&raw'
import HYDRAULIC_TEMPLATE from '/bg-rdf/templates/hydraulic.ttl?url&raw'
import MECHANICAL_TEMPLATE from '/bg-rdf/templates/mechanical.ttl?url&raw'

//==============================================================================

export class BGBaseComponent {
    #id: string
    #name: string|undefined
    #nodeType: string
    #template: BGComponentLibraryTemplate

    constructor(id: string, name: string, nodeType: string) {
        this.#id = id
        this.#name = name
        this.#nodeType = nodeType
        this.#template = BondgraphComponentTemplates.get(id)!
    }

    get id() {
        return this.#id
    }

    get name() {
        return this.#name
    }

    get style() {
        return this.#template.style
    }

    get template() {
        return this.#template
    }

    get isBondElement() {
        return this.#nodeType === BGF('BondElement').value
    }

    get isJunctionStructure() {
        return this.#nodeType === BGF('JunctionStructure').value
    }
}

//==============================================================================

interface Variable {
    name: string
    units: string
    value?: string
}

type IdVariableMap = Map<string, Variable>

//==============================================================================

interface PhysicalDomain {
    id: string
    flow: Variable
    potential: Variable
    quantity: Variable
}

//==============================================================================

type ElementTemplate = ElementIdName & {
    domain: string
    value?: Variable
    parameters: IdVariableMap
    states: IdVariableMap
    baseComponentId?: string
}

//==============================================================================

interface ObjectElementTemplate {
    baseComponent: BGBaseComponent
    elementTemplate?: ElementTemplate
}

interface PluginData {
    fillColours?: string[]
    location?: string
    species?: string
    template: ObjectElementTemplate
}

//==============================================================================

enum BG_INPUT {
    ElementType = 'bg-element-type',
    ElementSpecies = 'bg-species',
    ElementLocation = 'bg-location',
    ElementValue = 'bg-element-value'
}

enum BG_GROUP {
    ElementGroup = 'bg-element-group',
    ParameterGroup = 'bg-parameter-group',
    StateGroup = 'bg-state-group',
    StylingGroup = 'bg-styling-group'
}

const PROPERTY_GROUPS: PropertyGroup[] = [
    {
        groupId: BG_GROUP.ElementGroup,
        title: 'Element',
        items: [
            {
                itemId: BG_INPUT.ElementType,
                uri: RDF('type').value,
                name: 'Bond Element',
                possibleValues: [],
                optional: true
            },
            {
                itemId: BG_INPUT.ElementSpecies,
                uri: BGF('hasSpecies').value,
                name: 'Species',
                defaultValue: ''
            },
            {
                itemId: BG_INPUT.ElementLocation,
                uri: BGF('hasLocation').value,
                name: 'Location',
                defaultValue: ''
            },
            {
                itemId: BG_INPUT.ElementValue,
                uri: BGF('hasValue').value,
                name: 'Initial value',
                defaultValue: 0,
                numeric: true,
                optional: true
            }
        ]
    },
    {
        groupId: BG_GROUP.ParameterGroup,
        title: 'Parameters',
        items: []
    },
    {
        groupId: BG_GROUP.StateGroup,
        title: 'States',
        items: []
    }
]

const ELEMENT_GROUP_INDEX = 0
const PARAMS_GROUP_INDEX = 1
const STATES_GROUP_INDEX = 2

// Within ELEMENT_GROUP
const ELEMENT_VALUE_INDEX = 3

//==============================================================================

const STYLING_GROUP = {
    groupId: BG_GROUP.StylingGroup,
    title: 'Style',
    items: [],
    styling: {}
}

//==============================================================================

export class BondgraphPlugin implements PluginInterface {
    readonly id: string = 'bondgraph-plugin'

    #baseComponents: Map<string, BGBaseComponent> = new Map()
    #baseComponentToTemplates: Map<string, ElementTemplate[]> = new Map()
    #physicalDomains: Map<string, PhysicalDomain> = new Map()
    #elementTemplates: Map<string, ElementTemplate> = new Map()

    #rdfStore: RdfStore = new RdfStore('https://bg-rdf.org/ontologies/bondgraph-framework')

    constructor() {

//      const ontologySource = import.meta.glob('@renderer/assets/bg-rdf/ontology.ttl', { eager: true })
//      const templatesGlob = import.meta.glob('@renderer/assets/bg-rdf/templates/*.ttl', { eager: true })

        this.#rdfStore.load(BG_RDF_ONTOLOGY)
        this.#rdfStore.load(CHEMICAL_TEMPLATE)
        this.#rdfStore.load(ELECTRICAL_TEMPLATE)
        this.#rdfStore.load(HYDRAULIC_TEMPLATE)
        this.#rdfStore.load(MECHANICAL_TEMPLATE)

        this.#loadDomains()
        this.#loadBaseComponents()
        this.#assignTemplates()
        this.#loadTemplateParameters()

        pluginComponents.registerPlugin(this)
    }

    //==========================================================================

    getObjectTemplate(id: string): ObjectTemplate|undefined {
        const baseComponent = this.#baseComponents.get(id)
        if (baseComponent && baseComponent.template) {
            const template = baseComponent.template
            const metadataProperties: MetadataProperty[] = [
                [ RDF('type'), $rdf.namedNode(baseComponent.id)],
                [ BGF('hasSymbol'), $rdf.literal(baseComponent.template.symbol)]
            ]
            if (!template.noSpeciesLocation) {
                metadataProperties.push(
                    [ BGF('hasSpecies'), $rdf.literal('i')],
                    [ BGF('hasLocation'), $rdf.literal('j')]
                )
            }
            return {
                uri: template.uri,
                CellDLClass: CellDLComponent,
                name: template.name,
                image: template.image,
                metadataProperties: MetadataPropertiesMap.fromProperties(metadataProperties),
            }
        }
    }

    //======================================

    getPropertyGroups(): PropertyGroup[] {
        return PROPERTY_GROUPS
    }

    //======================================

    getStylingGroup(): PropertyGroup {
        return STYLING_GROUP
    }

    //==========================================================================

    newDocument(rdfStore: RdfStore) {

        // We are creating a BondgraphModel

        rdfStore.add(rdfStore.documentNode!, RDF('type'), BGF('BondgraphModel'))

        // Add a copy of the BG-RDF framework as a named graph, to use later when
        // finding BondElements and JunctionStructures

        const bgfGraph = $rdf.namedNode(BONDGRAPH_FRAMEWORK)
        for (const statement of this.#rdfStore.statements()) {
            rdfStore.add(statement.subject, statement.predicate, statement.object, bgfGraph)
        }
    }

    //======================================

    addDocumentMetadata(rdfStore: RdfStore) {
        const statements: string[] = []

        // Find the BondElements in the diagram

        rdfStore.query(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>
            SELECT ?uri
            WHERE {
                ?uri a ?type .
                ?type rdfs:subClassOf* bgf:BondElement
            }`, true)
        .map((r) => {
            statements.push(`<${rdfStore.documentUri}> bgf:hasBondElement ${r.get('uri')!.toString()} .`)
        })

        // Find the JunctionStructures in the diagram

        rdfStore.query(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            SELECT ?uri
            WHERE {
                ?uri a ?type .
                ?type rdfs:subClassOf* bgf:JunctionStructure
            }`, true)
        .map((r) => {
            statements.push(`<${rdfStore.documentUri}> bgf:hasJunctionStructure ${r.get('uri')!.toString()} .`)
        })

        // And add them to the BondgraphModel

        rdfStore.update(`${SPARQL_PREFIXES}
            INSERT DATA {
                ${statements.join('\n')}
            }
        `)
    }

    //==========================================================================

    addNewConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        const uri = connection.uri.toString()
        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            INSERT DATA {
                ${uri} bgf:hasSource ${connection.source!.uri.toString()} .
                ${uri} bgf:hasTarget ${connection.target!.uri.toString()} .
            }
        `)
    }

    deleteConnection(connection: CellDLConnection, rdfStore: RdfStore) {
        const uri = connection.uri.toString()
        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            DELETE DATA {
                ${uri} bgf:hasSource ${connection.source!.uri.toString()} .
                ${uri} bgf:hasTarget ${connection.target!.uri.toString()} .
            }
        `)
    }

    //==========================================================================

    getComponentProperties(celldlObject: CellDLObject, componentProperties: PropertyGroup[], rdfStore: RdfStore) {
        alert.clear()
        if (celldlObject.isConnection) {
            const template = {}
            celldlObject.setPluginData(this.id, { template })
            componentProperties.forEach(group => {
                if (group.groupId === BG_GROUP.StylingGroup) {
                    this.#getElementStyling(celldlObject, group, true)
                }
            })
        } else {
            const template = this.#getObjectElementTemplate(celldlObject, rdfStore)
            if (!template) {
                return
            }
            celldlObject.setPluginData(this.id, { template })

            componentProperties.forEach(group => {
                if (group.groupId === BG_GROUP.ElementGroup) {
                    this.#getElementProperties(celldlObject, group, rdfStore)
                } else if (template.elementTemplate) {
                    if (group.groupId === BG_GROUP.ParameterGroup) {
                        this.#setVariableTemplates(template.elementTemplate.parameters, group)
                        this.#getVariableProperties(celldlObject, group, rdfStore)
                    } else if (group.groupId === BG_GROUP.StateGroup) {
                        this.#setVariableTemplates(template.elementTemplate.states, group)
                        this.#getVariableProperties(celldlObject, group, rdfStore)
                    }
                } else if (group.groupId === BG_GROUP.StylingGroup) {
                    this.#getElementStyling(celldlObject, group, false)
                }
            })
        }
    }

    #getElementProperties(celldlObject: CellDLObject,
                          group: PropertyGroup,  rdfStore: RdfStore) {
        const propertyTemplates = PROPERTY_GROUPS[ELEMENT_GROUP_INDEX]!
        const pluginData = (<PluginData>celldlObject.pluginData(this.id))
        const template = pluginData.template
        propertyTemplates.items.forEach((itemTemplate: ItemDetails) => {
            const items: ItemDetails[] = []
            if (itemTemplate.itemId === BG_INPUT.ElementType) {
                if (template) {
                    const discreteItem = this.#getElementTypeItem(itemTemplate, template)
                    items.push(discreteItem)
                }
            } else if (itemTemplate.itemId === BG_INPUT.ElementSpecies ||
                       itemTemplate.itemId === BG_INPUT.ElementLocation ||
                       itemTemplate.itemId === BG_INPUT.ElementValue) {
                const item = getItemProperty(celldlObject, itemTemplate, rdfStore)
                if (item) {
                    if (itemTemplate.itemId === BG_INPUT.ElementSpecies) {
                        pluginData.species = String(item.value)
                    }
                    if (itemTemplate.itemId === BG_INPUT.ElementLocation) {
                        pluginData.location = String(item.value)
                    }
                    items.push(item)
                }
            }
            group.items.push(...items)
        })
    }

    #getElementStyling(celldlObject: CellDLObject, group: PropertyGroup, connection: boolean) {
        if (connection) {
            group.styling = {
                pathStyle: getSvgPathStyle(celldlObject.celldlSvgElement!.svgElement)
            }
        } else {
            const pluginData = (<PluginData>celldlObject.pluginData(this.id))
            if (!('fillColours' in pluginData)) {
                pluginData.fillColours = getSvgFillStyle(celldlObject.celldlSvgElement!.svgElement.outerHTML)
            }
            group.styling = {
                fillColours: pluginData.fillColours || []
            }
        }
    }

    #getVariableProperties(celldlObject: CellDLObject, group: PropertyGroup, rdfStore: RdfStore) {
        const objectUri = celldlObject.uri.toString()

        const values: Map<string, string> = new Map()
        rdfStore.query(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            SELECT ?name ?value
            WHERE {
                ${objectUri} bgf:parameterValue [
                    bgf:varName ?name ;
                    bgf:hasValue ?value
                ]
            }`
        ).map((r) => {
            values.set(r.get('name')!.value, r.get('value')!.value)
        })

        group.items.forEach(item => {
            const itemVariable = item.itemId.split('/')
            const varName = itemVariable[1]!
            if (values.has(varName)) {
                const valueUnits = values.get(varName)!.split(' ')
                item.value = valueUnits[0]
                item.units = valueUnits[1]
            }
        })
    }

    //==========================================================================

    #deleteElementValue(celldlObject: CellDLObject, rdfStore: RdfStore) {
        const item = PROPERTY_GROUPS[ELEMENT_GROUP_INDEX]!.items[ELEMENT_VALUE_INDEX]!
        updateItemProperty(item.uri, { newValue: '', oldValue: ''}, celldlObject, rdfStore)
    }

    #setElementValueTemplate(variable: Variable|undefined, group: PropertyGroup) {
        const haveVarItem = (group.items.length > ELEMENT_VALUE_INDEX)

        const itemDefn = PROPERTY_GROUPS[ELEMENT_GROUP_INDEX]!.items[ELEMENT_VALUE_INDEX]!
        if (haveVarItem) {
            const item = group.items[ELEMENT_VALUE_INDEX]!
            if (variable) {
                item.name = `${itemDefn.name} (${variable.units})`
                item.optional = false
            } else {
                item.optional = false
                item.value = ''
            }
        } else if (variable) {
            group.items.push(Object.assign({}, itemDefn, {
                name: `${itemDefn.name} (${variable.units})`,
                optional: false
            }))
        }
    }

    #setVariableTemplates(variables: IdVariableMap, group: PropertyGroup, reset: boolean=false) {
        if (reset) {
            group.items.length = 0
        }
        if (group.items.length === 0) {
            for (const variable of variables.values()) {
                // @ts-expect-error: WIP
                group.items.push({
                    itemId: `${group.groupId}/${variable.name}`,
                    uri: BGF('parameterValue').value,
                    name: `${variable.name} (${variable.units})`,
                    minimumValue: 0,
                    defaultValue: 0,
                    numeric: true
                })
            }
        }
    }

    //==========================================================================

    async updateComponentProperties(celldlObject: CellDLObject, itemId: string, value: ValueChange,
                                    componentProperties: PropertyGroup[], rdfStore: RdfStore) {
        await this.#updateElementProperties(value, itemId, celldlObject, rdfStore)

        const template = (<PluginData>celldlObject.pluginData(this.id)).template
        if (template.elementTemplate) {
            if (itemId === BG_INPUT.ElementType && value.newValue !== value.oldValue) {
                    this.#setElementValueTemplate(template.elementTemplate.value,
                                                  componentProperties[ELEMENT_GROUP_INDEX]!)
                    if (!template.elementTemplate.value) {
                        this.#deleteElementValue(celldlObject, rdfStore)
                    }
                    this.#setVariableTemplates(template.elementTemplate.parameters,
                                               componentProperties[PARAMS_GROUP_INDEX]!, true)
                    this.#setVariableTemplates(template.elementTemplate.states,
                                               componentProperties[STATES_GROUP_INDEX]!, true)
                }
            this.#updateVariableProperties(value, itemId, celldlObject, template.elementTemplate, rdfStore)
        }
    }

    //==================================

    async updateComponentStyling(celldlObject: CellDLObject, objectType: string, styling: StyleObject) {
        const pluginData = (<PluginData>celldlObject.pluginData(this.id))
        if (objectType === 'node' && 'fillColours' in styling) {
            const fillColours = styling.fillColours as string[] || []
            if (fillColours.toString() !== pluginData.fillColours!.toString()) {
                pluginData.fillColours = [...fillColours]
                await this.#updateSvgElement(celldlObject, pluginData.species, pluginData.location)
            }
        } else if (objectType === 'path' && 'pathStyle' in styling) {
            setSvgPathStyle(celldlObject.celldlSvgElement!.svgElement, styling.pathStyle as IPathStyle)
        }
    }

    //==================================

    async #updateElementProperties(value: ValueChange, itemId: string,
                             celldlObject: CellDLObject, rdfStore: RdfStore) {
        const propertyTemplates = PROPERTY_GROUPS[ELEMENT_GROUP_INDEX]!
        const pluginData = (<PluginData>celldlObject.pluginData(this.id))
        const template = pluginData.template
        for (const item of propertyTemplates.items) {
            if (itemId === item.itemId) {
                alert.clear()
                if (itemId === BG_INPUT.ElementType) {
                    this.#updateElementType(item, value, celldlObject, rdfStore)

                } else if (itemId === BG_INPUT.ElementSpecies) {
                    const errorMsg = await this.#updateSvgElement(celldlObject, value.newValue, pluginData.location)
                    if (errorMsg === '') {
                        updateItemProperty(item.uri, value, celldlObject, rdfStore)
                        pluginData.species = value.newValue
                    } else {
                        alert.error(errorMsg)
                    }
                } else if (itemId === BG_INPUT.ElementLocation) {
                    pluginData.location = value.newValue
                    const errorMsg = await this.#updateSvgElement(celldlObject, pluginData.species, value.newValue)
                    if (errorMsg === '') {
                        updateItemProperty(item.uri, value, celldlObject, rdfStore)
                        pluginData.location = value.newValue
                    } else {
                        alert.error(errorMsg)
                    }
                } else if (itemId === BG_INPUT.ElementValue) {
                    this.#updateElementValue(value, celldlObject, rdfStore)
                }
                break
            }
        }
    }

    //==================================

    #updateElementValue(value: ValueChange, celldlObject: CellDLObject, rdfStore: RdfStore) {
        const objectUri = celldlObject.uri.toString()

        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            DELETE {
                ${objectUri} bgf:hasValue ?value
            }
            WHERE {
                ${objectUri} bgf:hasValue ?value
            }`)
        const newValue = value.newValue.trim()
        const template = (<PluginData>celldlObject.pluginData(this.id)).template
        const variable = template.elementTemplate!.value
        if (newValue) {
            rdfStore.update(`${SPARQL_PREFIXES}
                PREFIX : <${rdfStore.documentUri}#>

                INSERT DATA {
                   ${objectUri} bgf:hasValue "${value.newValue} ${variable!.units}"^^cdt:ucum .
                }
            `)
        }
    }

    //==================================

    #updateVariableProperties(value: ValueChange, itemId: string, celldlObject: CellDLObject,
                              elementTemplate: ElementTemplate, rdfStore: RdfStore) {
        const itemVariable = itemId.split('/')
        if (itemVariable.length !== 2) {
            return
        }
        itemId = itemVariable[0]!
        if (itemId !== BG_GROUP.ParameterGroup && itemId === BG_GROUP.StateGroup) {
            return
        }
        const varName = itemVariable[1]!
        const objectUri = celldlObject.uri.toString()
        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            DELETE WHERE {
                ${objectUri} bgf:parameterValue ?pv .
                ?pv bgf:varName "${varName}" ;
                    bgf:hasValue ?value .
            }`)
        const variable = (itemId === BG_GROUP.ParameterGroup)
                       ? elementTemplate.parameters.get(varName)
                       : elementTemplate.states.get(varName)
        if (!variable) {
            return
        }
        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            INSERT DATA {
                ${objectUri} bgf:parameterValue _:pv .
                _:pv bgf:varName "${varName}" ;
                     bgf:hasValue "${value.newValue} ${variable.units}"^^cdt:ucum .
            }
        `)
// Check units...
//            ucum.isConvertible(units1: string, units2: string)
    }

    //==================================

    async #updateSvgElement(celldlObject: CellDLObject,
                            species: string|undefined, location: string|undefined): Promise<string> {
        // Update and redraw the component's SVG element

        const pluginData = (<PluginData>celldlObject.pluginData(this.id))
        let svgData = ''
        try {
            svgData = svgImage(pluginData.template.baseComponent,
                                     species, location,
                                     pluginData.fillColours)
        } catch (error: any) {
            return (error as Error).message
        }
        if (svgData) {
            const celldlSvgElement = celldlObject.celldlSvgElement!
            await celldlSvgElement.updateSvgElement(svgData)
            celldlSvgElement.redraw()
        }
        return ''
    }

    //==========================================================================

    styleRules(): string {
        return '.celldl-Connection.bondgraph.arrow { marker-end:url(#connection-end-arrow-bondgraph) }'
    }

    svgDefinitions(): string {
        return arrowMarkerDefinition('connection-end-arrow-bondgraph', 'bondgraph')
    }

    //==========================================================================

    #getObjectElementTemplate(celldlObject: CellDLObject, rdfStore: RdfStore): ObjectElementTemplate|undefined {
        let baseComponentId: string|undefined = undefined
        let elementTemplate: ElementTemplate|undefined = undefined
        rdfStore.query(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            SELECT ?type WHERE {
                ${celldlObject.uri.toString()} a ?type
            }`
        ).map((r) => {
            const rdfType = r.get('type')!.value
            if (this.#baseComponents.has(rdfType)) {
                baseComponentId = rdfType
            } else if (this.#elementTemplates.has(rdfType)) {
                elementTemplate = this.#elementTemplates.get(rdfType)!
                baseComponentId = elementTemplate.baseComponentId
            }
        })
        if (baseComponentId) {
            return {
                baseComponent: this.#baseComponents.get(baseComponentId)!,
                elementTemplate
            }
        } else {
            console.error(`Cannot find base component for ${celldlObject.uri}`)
        }
    }

    //==========================================================================

    #getElementTypeItem(itemTemplate: ItemDetails, template: ObjectElementTemplate): ItemDetails {
        const discreteItem = <IUiJsonDiscreteInput>{...itemTemplate}

        discreteItem.possibleValues = []
        const baseComponent = template.baseComponent
        const templates = this.#baseComponentToTemplates.get(baseComponent.id)! || []

        // `baseComponent` and `templates` are possible values
        discreteItem.possibleValues.push({
            name: baseComponent.name || '',
            value: baseComponent.id,
            emphasise: true
        })
        discreteItem.possibleValues.push(
            ...templates.map(t => {
                return {
                    name: t.name,
                    value: t.id
                }
            })
        )

        const discreteValue = template.elementTemplate
                            ? template.elementTemplate.id
                            : baseComponent.id
        const index = discreteItem.possibleValues.findIndex(v => {
            if (String(discreteValue) === String(v.value)) {
                return true
            }
        })
        if (index !== undefined) {
            discreteItem.value = discreteItem.possibleValues[index]!
        }

        return discreteItem as ItemDetails
    }

    //==========================================================================

    #updateElementType(itemTemplate: ItemDetails, value: ValueChange,
                       celldlObject: CellDLObject, rdfStore: RdfStore) {
        const objectUri = celldlObject.uri.toString()
        const pluginData = (<PluginData>celldlObject.pluginData(this.id))
        const baseComponent = pluginData.template.baseComponent

        const deleteTriples: string[] = []
        if (this.#elementTemplates.has(value.oldValue)) {
            deleteTriples.push(`${objectUri} a <${value.oldValue}>`)
            const baseComponentId = this.#elementTemplates.get(value.oldValue)!.baseComponentId
            deleteTriples.push(`${objectUri} a <${baseComponent.id}>`)
        } else if (this.#baseComponents.has(value.oldValue)) {
            deleteTriples.push(`${objectUri} a <${value.oldValue}>`)
        }
        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            DELETE DATA {
                ${deleteTriples.join('\n')}
            }`)

        rdfStore.update(`${SPARQL_PREFIXES}
            PREFIX : <${rdfStore.documentUri}#>

            INSERT DATA { ${objectUri} a <${value.newValue}> }
        `)
        pluginData.template.elementTemplate = this.#elementTemplates.get(value.newValue)
    }

    //==========================================================================
    //==========================================================================

    #query(sparql: string) {
        return this.#rdfStore.query(`${SPARQL_PREFIXES}${sparql}`)
    }

    #loadDomains() {
        this.#query(`
            SELECT ?domain
                ?flowName ?flowUnits
                ?potentialName ?potentialUnits
                ?quantityName ?quantityUnits
            WHERE {
              ?domain a bgf:PhysicalDomain ;
                bgf:hasFlow [
                    bgf:varName ?flowName ;
                    bgf:hasUnits ?flowUnits
                ] ;
                bgf:hasPotential [
                    bgf:varName ?potentialName ;
                    bgf:hasUnits ?potentialUnits
                ] ;
                bgf:hasQuantity [
                    bgf:varName ?quantityName ;
                    bgf:hasUnits ?quantityUnits
                ] .
            }`
        ).map((r) => {
            const domain = r.get('domain')!
            this.#physicalDomains.set(domain.value, {
                id: domain.value,
                flow: {
                    name: r.get('flowName')!.value,
                    units: r.get('flowUnits')!.value,
                },
                potential: {
                    name: r.get('potentialName')!.value,
                    units: r.get('potentialUnits')!.value,
                },
                quantity: {
                    name: r.get('quantityName')!.value,
                    units: r.get('quantityUnits')!.value,
                },
            })
        })
    }

    #loadBaseComponents() {
        // Get information about the components showing in the add component tool
        this.#query(`
            SELECT ?element ?label ?base WHERE {
                ?element rdfs:subClassOf ?base .
                OPTIONAL { ?element rdfs:label ?label }
                { ?base rdfs:subClassOf* bg:BondElement }
            UNION
                { ?base rdfs:subClassOf* bg:JunctionStructure }
            }`
        ).map((r) => {
            const element = r.get('element')!
            const label = r.get('label')
            const base = r.get('base')!
            if (BondgraphComponentTemplates.has(element.value)) {
                const component = new BGBaseComponent(element.value,
                                            label ? label.value : getCurie(element.value),
                                            base.value)
                this.#baseComponents.set(element.value, component)
            }
        })
    }

    #getDiffVariable(domain: PhysicalDomain, relation: string): Variable|undefined {
        relation = relation.replace(/\n \s*/g, '')  // Remove blanks and new lines
        const diffStateVar = relation.match(/<apply><diff\/><bvar><ci>[^\<]*<\/ci><\/bvar><ci>([^\<]*)<\/ci><\/apply>/)
        if (diffStateVar) {
            const symbol = diffStateVar[1]
            if (symbol === domain.quantity.name) {
                return domain.quantity
            } else if (symbol === domain.flow.name) {
                return domain.flow
            } else if (symbol === domain.potential.name) {
                return domain.potential
            }
        }
    }

    #assignTemplates() {
        // Find what templates correspond to each base element
        this.#query(`
            SELECT ?element ?label ?domain ?relation ?base WHERE {
                ?element
                    rdfs:subClassOf* ?subType .
                    ?subType bgf:hasDomain ?domain ;
                            rdfs:subClassOf* ?base .
                    ?base rdfs:subClassOf bgf:BondElement .
                OPTIONAL { ?element rdfs:label ?label }
                OPTIONAL { ?subType bgf:constitutiveRelation ?relation }
                FILTER EXISTS {
                    { ?element a bgf:ElementTemplate }
                UNION
                    { ?element a bgf:CompositeElement }
                }
            }`
        ).map((r) => {
            const component = this.#baseComponents.get(r.get('base')!.value)
            if (component) {
                if (!this.#baseComponentToTemplates.has(component.id)) {
                    this.#baseComponentToTemplates.set(component.id, [])
                }
                const element = r.get('element')!
                const label = r.get('label')
                const domainId = r.get('domain')!.value
                const template: ElementTemplate = {
                    id: element.value,
                    domain: domainId,
                    name: label ? label.value : getCurie(element.value),
                    parameters: new Map(),
                    states: new Map(),
                    baseComponentId: component.id
                }
                const domain = this.#physicalDomains.get(domainId)
                if (domain) {
                    if (component.id === BGF('PotentialSource').value) {
                        template.value = domain.potential
                    } else if (component.id === BGF('FlowSource').value) {
                        template.value = domain.flow
                    } else {
                        const relation = r.get('relation')
                        if (relation) {
                            const differentiatedVariable = this.#getDiffVariable(domain, relation.value)
                            if (differentiatedVariable) {
                                template.value = differentiatedVariable
                            }
                        }
                    }
                }
                this.#elementTemplates.set(template.id, template)
                this.#baseComponentToTemplates.get(component.id)!.push(template)
            }
        })

        // Composite element templates are incorrectly inserted into `baseComponentToTemplates`
        // above, so now correct their entries
        this.#query(`
            SELECT ?element ?base WHERE {
                { ?element
                    a bgf:CompositeElement ;
                    rdfs:subClassOf* ?base ;
                    rdfs:subClassOf* bgf:ZeroStorageNode
                }
                UNION
                { ?element
                    a bgf:CompositeElement ;
                    rdfs:subClassOf* ?base ;
                    rdfs:subClassOf* bgf:OneResistanceNode
                }
            }`
        ).map((r) => {
            const base = r.get('base')!
            if ([BGF('ZeroStorageNode').value, BGF('OneResistanceNode').value]
                    .includes(base.value)) {
                const component = this.#baseComponents.get(r.get('base')!.value)
                if (component) {
                    const element = r.get('element')!
                    const template = this.#elementTemplates.get(element.value)
                    if (template) {
                        if (!this.#baseComponentToTemplates.has(component.id)) {
                            this.#baseComponentToTemplates.set(component.id, [])
                        }
                        const templates = this.#baseComponentToTemplates.get(component.id)!
                        if (template.baseComponentId) {
                            // Remove from list assigned above
                            const baseTemplates = this.#baseComponentToTemplates.get(template.baseComponentId)
                            if (baseTemplates) {
                                const filtered =
                                this.#baseComponentToTemplates.set(template.baseComponentId,
                                    baseTemplates.filter(t => (t.id !== element.value)))
                            }
                        }
                        template.baseComponentId = component.id
                        this.#baseComponentToTemplates.get(component.id)!.push(template)
                    }
                }
            }
        })
    }

    #saveParametersAndStates(r: Map<string, $oxigraph.Term>) {
        const element = r.get('element')!
        const template = this.#elementTemplates.get(element.value)
        if (!template) return ;
        if (r.has('parameterName')) {
            const name = r.get('parameterName')!.value
            template.parameters.set(name, {
                name: name,
                units: r.get('parameterUnits')!.value
            })
        }
        if (r.has('variableName')) {
            const name = r.get('variableName')!.value
            template.states.set(name, {
                name: name,
                units: r.get('variableUnits')!.value
            })
        }
    }

    #loadTemplateParameters() {
        // Find parameters and variables for Element templates
        this.#query(`
            SELECT ?element ?parameterName ?parameterUnits
                            ?variableName ?variableUnits
            WHERE {
                ?element a bgf:ElementTemplate .
                {
                    ?element bgf:hasParameter [
                        bgf:varName ?parameterName ;
                        bgf:hasUnits ?parameterUnits
                    ]
                }
                UNION
                {
                    ?element bgf:hasVariable [
                        bgf:varName ?variableName ;
                        bgf:hasUnits ?variableUnits
                    ]
                }
            }`
        ).map((r) => {
            this.#saveParametersAndStates(r)
        })
        // Find parameters and variables for Composite templates
        this.#query(`
            SELECT ?element ?parameterName ?parameterUnits
                            ?variableName ?variableUnits
            WHERE {
                ?element a bgf:CompositeElement ;
                    rdfs:subClassOf ?base .
                ?base a bgf:ElementTemplate .
                {
                    ?base bgf:hasParameter [
                        bgf:varName ?parameterName ;
                        bgf:hasUnits ?parameterUnits
                    ]
                }
                UNION
                {
                    ?base bgf:hasVariable [
                        bgf:varName ?variableName ;
                        bgf:hasUnits ?variableUnits
                    ]
                }
            }`
        ).map((r) => {
            this.#saveParametersAndStates(r)
        })
    }
}

//==============================================================================
//==============================================================================
