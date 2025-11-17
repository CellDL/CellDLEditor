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

import { CellDLComponent } from '@editor/celldlObjects/index'
import { type ObjectTemplate } from '@editor/components/index'
import {
    type ComponentLibrary,
    type ComponentLibraryTemplate,
    type ElementIdName,
    type ObjectTemplate
} from '@editor/components/index'
import { type ItemDetails, type PropertyGroup } from '@editor/components/properties'
import * as $rdf from '@editor/metadata/index'
import { BGF_NAMESPACE, RDF_NAMESPACE, RDFS_NAMESPACE, SPARQL_PREFIXES } from '@editor/metadata/index'
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
        return this.#nodeType === BGF_NAMESPACE('BondElement').value
    }

    get isJunctionStructure() {
        return this.#nodeType === BGF_NAMESPACE('JunctionStructure').value
    }
}

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
    parameters: Variable[]
    states: Variable[],
    baseComponentId?: string
}

//==============================================================================

interface Variable {
    name: string
    units: string
    value?: string
}

//==============================================================================

const PROPERTY_GROUPS: PropertyGroup[] = [
    {
        title: 'Element',
        items: [
            {
                uri: RDF_NAMESPACE('type').value,
                name: 'Bond Element',
                defaultValue: 0,
                possibleValues: [],
                selector: RDFS_NAMESPACE('subClassOf').value,
                optional: true
            },
            {
                uri: BGF_NAMESPACE('hasSpecies').value,
                name: 'Species',
                defaultValue: ''
            },
            {
                uri: BGF_NAMESPACE('hasLocation').value,
                name: 'Location',
                defaultValue: ''
            }
        ]
    },
    {
        title: 'Parameters',
        items: []
    }
]

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
                [ RDFS_NAMESPACE('subClassOf'), $rdf.namedNode(baseComponent.id)],
                [ BGF_NAMESPACE('hasSpecies'), $rdf.literal('i')],
                [ BGF_NAMESPACE('hasLocation'), $rdf.literal('j')]
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

    #getElementTemplateNames(id: string): ElementTemplateName[] {
        const templates = this.#baseComponentToTemplates.get(id)
        if (templates) {
            return templates.map(t => {
                return {
                    id: t.id,
                    name: t.name
                }
            })
        }
        return []
    }

    getTemplateParameters(id: string): MetadataPropertiesMap {
        const elementTemplate = this.#elementTemplates.get(id)
        const metadataProperties: MetadataProperty[] = []
        if (elementTemplate) {
            for (const variable of elementTemplate.parameters) {
            }
            const domain = this.#physicalDomains.get(elementTemplate.domain)
            for (const variable of elementTemplate.states) {
            }
        }
        return MetadataPropertiesMap.fromProperties(metadataProperties)
    }

    propertyGroups(): PropertyGroup[] {
        return PROPERTY_GROUPS
    }

    propertyItem(itemTemplate: ItemDetails, metadataProperties: MetadataPropertiesMap): ItemDetails|undefined {
        const objectValue = metadataProperties.get(itemTemplate.uri)
        if (objectValue) {
            const propertyValue = objectValue.value
            if ('possibleValues' in itemTemplate) {
                const discreteItem = {...itemTemplate}
                if ('selector' in itemTemplate) {
                    const key = metadataProperties.get(itemTemplate.selector).value
                    if (key) {
                        const selection: ElementTemplateName[] = this.#getElementTemplateNames(key)
                        discreteItem.possibleValues = selection.map(s => {
                            return {
                                name: s.name,
                                value: s.id
                            }
                        })
                    }
                }
                const discreteValue = propertyValue
                discreteItem.value = discreteItem.possibleValues.findIndex(v => {
                    if (String(discreteValue) === String(v.value)) {
                        return true
                    }
                })
                return discreteItem
            } else {
                return Object.assign({
                    value: propertyValue || itemTemplate.defaultValue || '',
                    ...itemTemplate
                })
            }
        } else if (!itemTemplate.optional) {
            // Non-optional fields with no `metadataProperties` value
            return {
                value: '',
                ...itemTemplate
            }
        }
    }

    styleRules(): string {
        return '.celldl-Connection.bondgraph.arrow { marker-end:url(#connection-end-arrow-bondgraph) }'
    }

    svgDefinitions(): string {
        return arrowMarkerDefinition('connection-end-arrow-bondgraph', 'bondgraph')
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

    #assignTemplates() {
        // Find what templates correspond to each base element
        this.#query(`
            SELECT ?element ?label ?domain ?base WHERE {
                ?element
                    rdfs:subClassOf* ?subType .
                    ?subType bgf:hasDomain ?domain ;
                            rdfs:subClassOf* ?base .
                    ?base rdfs:subClassOf bgf:BondElement .
                OPTIONAL { ?element rdfs:label ?label }
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
                const template = {
                    id: element.value,
                    domain: r.get('domain')!.value,
                    name: label ? label.value : getCurie(element.value),
                    parameters: [],
                    states: [],
                    baseComponentId: component.id
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
            if ([BGF_NAMESPACE('ZeroStorageNode').value, BGF_NAMESPACE('OneResistanceNode').value]
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
            template.parameters.push({
                name: r.get('parameterName')!.value,
                units: r.get('parameterUnits')!.value
            })
        }
        if (r.has('variableName')) {
            template.states.push({
                name: r.get('variableName')!.value,
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
