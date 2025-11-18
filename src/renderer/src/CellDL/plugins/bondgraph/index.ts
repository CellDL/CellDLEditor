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

import { arrowMarkerDefinition } from '@renderer/common/styling'
import { type IUiJsonDiscreteInput, type IUiJsonDiscreteInputPossibleValue } from '@renderer/libopencor/locUIJsonApi'

import {
    CellDLComponent,
    CellDLConnection,
    CellDLObject
} from '@editor/celldlObjects/index'
import {
    type ComponentLibrary,
    type ComponentLibraryTemplate,
    type ElementIdName,
    type ObjectTemplate
} from '@editor/components/index'
import {
    getItemProperty,
    type ItemDetails,
    type PropertyGroup,
    updateItemProperty,
    type ValueChange
} from '@editor/components/properties'
import * as $rdf from '@editor/metadata/index'
import { BGF, RDF, RDFS, SPARQL_PREFIXES } from '@editor/metadata/index'
import { getCurie, type MetadataProperty, MetadataPropertiesMap, RdfStore } from '@editor/metadata/index'

//==============================================================================

import BondgraphJsonData from '@renderer/plugins/bondgraph.json'

export const BondgraphComponents: ComponentLibrary = {
    name: BondgraphJsonData.name,
    components: BondgraphJsonData.components.filter(c => c.image)
}

if ('id' in BondgraphJsonData) {
    BondgraphComponents.id = String(BondgraphJsonData.id)
}

const BondgraphComponentTemplates: Map<string, ComponentLibraryTemplate> = new Map(
    BondgraphComponents.components.map(c => [c.id, c])
)

//==============================================================================
//==============================================================================

// Temp workaround until `import.meta.glob` is correctly configured...
// Files are in /public

import BG_RDF_ONTOLOGY from '/bg-rdf/ontology.ttl?url&raw'

import CHEMICAL_TEMPLATE from '/bg-rdf/templates/chemical.ttl?url&raw'
import ELECTRICAL_TEMPLATE from '/bg-rdf/templates/electrical.ttl?url&raw'
import HYDRAULIC_TEMPLATE from '/bg-rdf/templates/hydraulic.ttl?url&raw'
import MECHANICAL_TEMPLATE from '/bg-rdf/templates/mechanical.ttl?url&raw'

//==============================================================================

class BaseComponent {
    #id: string
    #label: string|undefined
    #nodeType: string
    #template: ComponentLibraryTemplate

    constructor(id: string, label: string, nodeType: string) {
        this.#id = id
        this.#label = label
        this.#nodeType = nodeType
        this.#template = BondgraphComponentTemplates.get(id)!
    }

    get id() {
        return this.#id
    }

    get label() {
        return this.#label
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
    baseComponentId: string
    elementTemplate?: ElementTemplate
}

//==============================================================================

enum INPUT {
    ElementType = 'bg-element-type',
    ElementSpecies = 'bg-species',
    ElementLocation = 'bg-location',
    ParameterValue = 'bg-parameter-value',
    StateValue = 'bg-state-value'
}
const PROPERTY_GROUPS: PropertyGroup[] = [
    {
        title: 'Element',
        items: [
            {
                itemId: INPUT.ElementType,
                uri: RDF('type').value,
                name: 'Bond Element',
                defaultValue: 0,
                possibleValues: [],
                optional: true
            },
            {
                itemId: INPUT.ElementSpecies,
                uri: BGF('hasSpecies').value,
                name: 'Species',
                defaultValue: ''
            },
            {
                itemId: INPUT.ElementLocation,
                uri: BGF('hasLocation').value,
                name: 'Location',
                defaultValue: ''
            }
        ]
    },
    {
        title: 'Parameters',
        items: []
    },
    {
        title: 'States',
        items: []
    }
]

const ELEMENT_GROUP_INDEX = 0
const PARAMS_GROUP_INDEX = 1
const STATES_GROUP_INDEX = 2

//==============================================================================

export class BondgraphPlugin {
    #baseComponents: Map<string, BaseComponent> = new Map()
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
    }

    getObjectTemplate(id: string): ObjectTemplate|undefined {
        const baseComponent = this.#baseComponents.get(id)
        if (baseComponent && baseComponent.template) {
            const template = baseComponent.template
            const metadataProperties: MetadataProperty[] = [
                [ RDF('type'), $rdf.namedNode(baseComponent.id)],
                [ BGF('hasSpecies'), $rdf.literal('i')],
                [ BGF('hasLocation'), $rdf.literal('j')]
            ]
            return {
                uri: template.id,
                CellDLClass: CellDLComponent,
                name: template.name,
                image: template.image,
                metadataProperties: MetadataPropertiesMap.fromProperties(metadataProperties),
            }
        }
    }

    getPropertyGroups(): PropertyGroup[] {
        return PROPERTY_GROUPS
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

    addDocumentMetadata(rdfStore: RdfStore) {
        const statements: string[] = []
        statements.push(`<${rdfStore.documentUri}> a bgf:BondgraphModel .`)

        rdfStore.update(`${SPARQL_PREFIXES}
            INSERT DATA {
                ${statements.join('\n')}
            }
        `)
    }

    //==========================================================================

    getComponentProperties(componentProperties: PropertyGroup[], celldlObject: CellDLObject, rdfStore: RdfStore) {
        const template = this.#getObjectsElementTemplate(celldlObject, rdfStore)

        this.#getElementProperties(celldlObject, template, componentProperties[ELEMENT_GROUP_INDEX]!, rdfStore)

        this.#getElementVariables(celldlObject, template, componentProperties[PARAMS_GROUP_INDEX]!,
                                  PROPERTY_GROUPS[PARAMS_GROUP_INDEX]!, rdfStore)

        this.#getElementVariables(celldlObject, template, componentProperties[STATES_GROUP_INDEX]!,
                                  PROPERTY_GROUPS[STATES_GROUP_INDEX]!, rdfStore)
    }

    #getElementProperties(celldlObject: CellDLObject, template: ObjectElementTemplate|undefined,
                          group: PropertyGroup,  rdfStore: RdfStore) {
        const propertyTemplates = PROPERTY_GROUPS[ELEMENT_GROUP_INDEX]!
        propertyTemplates.items.forEach((itemTemplate: ItemDetails) => {
            const items: ItemDetails[] = []
            if (itemTemplate.itemId === INPUT.ElementType) {
                if (template) {
                    const discreteItem = this.#getElementTypeItem(itemTemplate, template)
                    items.push(discreteItem)
                }
            } else if (itemTemplate.itemId === INPUT.ElementSpecies ||
                       itemTemplate.itemId === INPUT.ElementLocation) {
                const item = getItemProperty(celldlObject, itemTemplate, rdfStore)
                if (item) {
                    items.push(item)
                }
            }
            group.items.push(...items)
        })
    }

    #getElementVariables(celldlObject: CellDLObject, template: ObjectElementTemplate|undefined,
                          group: PropertyGroup,  propertyTemplates: PropertyGroup, rdfStore: RdfStore) {
        if (template && template.elementTemplate) {
            this.#setVariableTemplates(template.elementTemplate.parameters, group, INPUT.ParameterValue)
            this.#setVariableTemplates(template.elementTemplate.states, group, INPUT.StateValue)

            this.#setVariableProperties(celldlObject, group, propertyTemplates, rdfStore)
        }
    }

    #setVariableTemplates(variables: IdVariableMap, group: PropertyGroup, itemId: INPUT, reset: boolean=false) {
        if (reset) {
            group.items.length = 0
        }
        if (group.items.length === 0) {
            for (const variable of variables.values()) {
                // @ts-expect-error: WIP
                group.items.push({
                    itemId: `${itemId}/${variable.name}`,
                    uri: BGF('parameterValue').value,
                    name: `${variable.name} (${variable.units})`,
                    minimumValue: 0,
                    defaultValue: 0,
                    value: 0
                })
            }
        }
    }

    #setVariableProperties(celldlObject: CellDLObject, group: PropertyGroup,
                           propertyTemplates: PropertyGroup,  rdfStore: RdfStore) {
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
            }
        })
    }

    //==========================================================================

    updateComponentProperties(componentProperties: PropertyGroup[], value: ValueChange, itemId: string,
                              celldlObject: CellDLObject, rdfStore: RdfStore) {
        this.#updateElementProperties(value, itemId, celldlObject, rdfStore)

        const template = this.#getObjectsElementTemplate(celldlObject, rdfStore)
        if (template && template.elementTemplate) {
            if (itemId === INPUT.ElementType && value.newValue !== value.oldValue) {
                    this.#setVariableTemplates(template.elementTemplate.parameters, componentProperties[PARAMS_GROUP_INDEX]!,
                                               INPUT.ParameterValue, true)
                    this.#setVariableTemplates(template.elementTemplate.states, componentProperties[STATES_GROUP_INDEX]!,
                                               INPUT.StateValue), true
                }

            this.#updateVariableProperties(value, itemId, celldlObject, template.elementTemplate, rdfStore)
        }
    }

    #updateElementProperties(value: ValueChange, itemId: string,
                            celldlObject: CellDLObject, rdfStore: RdfStore) {
        const propertyTemplates = PROPERTY_GROUPS[ELEMENT_GROUP_INDEX]!
        for (const itemTemplate of propertyTemplates.items) {
            if (itemId === itemTemplate.itemId) {
                if (itemId === INPUT.ElementType) {
                    this.#updateElementType(itemTemplate, value, celldlObject, rdfStore)

                } else if (itemId === INPUT.ElementSpecies ||
                           itemId === INPUT.ElementLocation) {
                   updateItemProperty(itemTemplate.uri, value, celldlObject, rdfStore)

                }
                break
            }
        }
    }

    #updateVariableProperties(value: ValueChange, itemId: string, celldlObject: CellDLObject,
                              elementTemplate: ElementTemplate, rdfStore: RdfStore) {
        const itemVariable = itemId.split('/')
        if (itemVariable.length !== 2) {
            return
        }
        itemId = itemVariable[0]!
        if (itemId !== INPUT.ParameterValue && itemId === INPUT.StateValue) {
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
        let variable = elementTemplate.parameters.get(varName)
        if (!variable) {
            variable = elementTemplate.states.get(varName)
        }
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

    //==========================================================================

    styleRules(): string {
        return '.celldl-Connection.bondgraph.arrow { marker-end:url(#connection-end-arrow-bondgraph) }'
    }

    svgDefinitions(): string {
        return arrowMarkerDefinition('connection-end-arrow-bondgraph', 'bondgraph')
    }

    //==========================================================================

    #getObjectsElementTemplate(celldlObject: CellDLObject, rdfStore: RdfStore): ObjectElementTemplate|undefined {
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
                baseComponentId,
                elementTemplate
            }
        }
    }

    //==========================================================================

    #getElementTypeItem(itemTemplate: ItemDetails, template: ObjectElementTemplate): ItemDetails {
        const discreteItem = <IUiJsonDiscreteInput & {
            value: string|number
        }>{...itemTemplate}

        discreteItem.possibleValues = []
        const baseComponent = this.#baseComponents.get(template.baseComponentId)!
        const templates = this.#baseComponentToTemplates.get(template.baseComponentId)! || []

        // `baseComponent` and `templates` are possible values
        discreteItem.possibleValues.push({
            name: baseComponent.label || '',
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

        if (template.elementTemplate) {
            // this, along with baseComponent, determines selected item
        }
        const discreteValue = template.elementTemplate ? template.elementTemplate.id
                            : template.baseComponentId ? template.baseComponentId
                            : ""
        discreteItem.value = discreteItem.possibleValues.findIndex(v => {
            if (String(discreteValue) === String(v.value)) {
                return true
            }
        })
        return discreteItem as ItemDetails
    }

    //==========================================================================

    #updateElementType(itemTemplate: ItemDetails, value: ValueChange,
                       celldlObject: CellDLObject, rdfStore: RdfStore) {
        const objectUri = celldlObject.uri.toString()
        const deleteTriples: string[] = []
        if (this.#elementTemplates.has(value.oldValue)) {
            deleteTriples.push(`${objectUri} a <${value.oldValue}>`)
            const baseComponentId = this.#elementTemplates.get(value.oldValue)!.baseComponentId
            deleteTriples.push(`${objectUri} a <${baseComponentId}>`)
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
    }

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
                { ?base rdfs:subClassOf bg:BondElement }
            UNION
                { ?base rdfs:subClassOf bg:JunctionStructure }
            }`
        ).map((r) => {
            const element = r.get('element')!
            const label = r.get('label')
            const base = r.get('base')!
            if (BondgraphComponentTemplates.has(element.value)) {
                const component = new BaseComponent(element.value,
                                            label ? label.value : getCurie(element.value),
                                            base.value)
                this.#baseComponents.set(element.value, component)
            }
        })
    }

    #getDiffVariable(domainId: string, relation: string): Variable|undefined {
        const domain = this.#physicalDomains.get(domainId)
        if (domain) {
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
                const relation = r.get('relation')
                if (relation) {
                    const differentiatedVariable = this.#getDiffVariable(domainId, relation.value)
                    if (differentiatedVariable) {
                        template.value = differentiatedVariable
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
