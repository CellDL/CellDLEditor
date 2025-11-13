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

import * as vue from 'vue'

import { BGF_NAMESPACE, getCurie, RdfStore } from '@editor/metadata/index'

import { type EditorPlugin } from '@editor/plugins/index'
import { type ComponentLibrary, type ComponentTemplate } from '@editor/plugins/components'

//==============================================================================

import BondgraphJsonData from '@renderer/plugins/bondgraph.json'

export const BondgraphComponents: ComponentLibrary = {
    name: BondgraphJsonData.name,
    components: BondgraphJsonData.components.filter(c => c.image)
}

if ('id' in BondgraphJsonData) {
    BondgraphComponents.id = String(BondgraphJsonData.id)
}

const BondgraphComponentIds = BondgraphComponents.components.map(c => c.id)

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

    constructor(id: string, label: string, nodeType: string) {
        this.#id = id
        this.#label = label
        this.#nodeType = nodeType
    }

    get id() {
        return this.#id
    }

    get label() {
        return this.#label
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

interface ElementTemplate {
    id: string
    domain: string
    name: string
}

class TemplateParameter {

}

//==============================================================================

interface Variable {
    name: string
    units: string
    value?: string
}

//==============================================================================

export class BondgraphPlugin implements EditorPlugin {
    #baseComponents: Map<string, BaseComponent> = new Map()
    #baseComponentToTemplates: Map<string, ElementTemplate[]> = new Map()
    #physicalDomains: Map<string, PhysicalDomain> = new Map()
    #templateParameters: Map<string, TemplateParameter[]> = new Map()

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
        this.#getTemplateParameters()
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
            if (BondgraphComponentIds.includes(element.value)) {
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
                this.#baseComponentToTemplates.get(component.id)!.push({
                    id: element.value,
                    domain: r.get('domain')!.value,
                    name: label ? label.value : getCurie(element.value)
                })
            }
        })
    }

    #getTemplateParameters() {
        // WIP
    }
}

//==============================================================================
//==============================================================================
