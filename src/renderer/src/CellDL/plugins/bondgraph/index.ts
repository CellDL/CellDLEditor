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

import { CellDLComponent } from '@editor/celldlObjects/index'
import { type ObjectTemplate } from '@editor/components/index'
import * as $rdf from '@editor/metadata/index'
import { BGF_NAMESPACE, getCurie, RDFS_NAMESPACE, RdfStore } from '@editor/metadata/index'
import { type MetadataProperty, MetadataPropertiesMap } from '@editor/metadata/index'
import { type ComponentLibrary, type ComponentTemplate, type ElementTemplateName } from '@editor/plugins/index'

//==============================================================================

import BondgraphJsonData from '@renderer/plugins/bondgraph.json'

export const BondgraphComponents: ComponentLibrary = {
    name: BondgraphJsonData.name,
    components: BondgraphJsonData.components.filter(c => c.image)
}

if ('id' in BondgraphJsonData) {
    BondgraphComponents.id = String(BondgraphJsonData.id)
}

const BondgraphComponentTemplates: Map<string, ComponentTemplate> = new Map(
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

const SPARQL_PREFIXES = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX bgf: ${BGF_NAMESPACE('').toString()}
`
//==============================================================================

class BaseComponent {
    #id: string
    #label: string|undefined
    #nodeType: string
    #template: ComponentTemplate

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

type ElementTemplate = ElementTemplateName & {
    domain: string
    parameters: Variable[]
    states: Variable[]
}

//==============================================================================

interface Variable {
    name: string
    units: string
    value?: string
}

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
                label: template.label,
                image: template.image,
                metadataProperties: MetadataPropertiesMap.fromProperties(metadataProperties)
            }
        }
    }

    getElementTemplateNames(id: string): ElementTemplateName[] {
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
        const parameterProperties: MetadataProperty[] = []
        const elementTemplate = this.#elementTemplates.get(id)
        if (elementTemplate) {
            for (const variable of elementTemplate.parameters) {
            }
            const domain = this.#physicalDomains.get(elementTemplate.domain)
            for (const variable of elementTemplate.states) {
            }
        }
        return MetadataPropertiesMap.fromProperties(parameterProperties)
    }

    #query(sparql: string) {
        return this.#rdfStore.sparqlQuery(`${SPARQL_PREFIXES}${sparql}`)
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
            SELECT ?element ?label ?subType WHERE {
                ?element rdfs:subClassOf ?subType .
                OPTIONAL { ?element rdfs:label ?label }
                { ?element rdfs:subClassOf bgf:BondElement }
            UNION
                { ?element rdfs:subClassOf bgf:JunctionStructure }
            }`
        ).map((r) => {
            const element = r.get('element')!
            const label = r.get('label')
            const subType = r.get('subType')!
            if (BondgraphComponentTemplates.has(element.value)) {
                const component = new BaseComponent(element.value,
                                            label ? label.value : getCurie(element.value),
                                            subType.value)
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
                    states: []
                }
                this.#elementTemplates.set(template.id, template)
                this.#baseComponentToTemplates.get(component.id)!.push(template)
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
