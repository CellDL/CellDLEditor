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

import { write as prettyTurtle } from '@jeswr/pretty-turtle'

//==============================================================================

export type BlankNode = $oxigraph.BlankNode

export const blankNode = $oxigraph.blankNode

export function isBlankNode(term: unknown): boolean {
    // @ts-expect-error: term is of unknown type
    return !!term.termType && term.termType === 'BlankNode'
}

//==============================================================================

export type Literal = $oxigraph.Literal

export const literal = $oxigraph.literal

export function isLiteral(term: unknown): boolean {
    // @ts-expect-error: term is of unknown type
    return !!term.termType && term.termType === 'Literal'
}

//==============================================================================

export interface NamedNode extends $oxigraph.NamedNode {
    uri: string
    id: () => string
}

function makeNamedNode(term: $oxigraph.Term): NamedNode | $oxigraph.Term {
    if (isNamedNode(term)) {
        ;(term as NamedNode).uri = term.value
        ;(term as NamedNode).id = () => {
            let parts = term.value.split('#')
            if (parts.length < 2) {
                parts = term.value.split('/')
            }
            return parts.length > 1 ? parts.at(-1) : ''
        }
        return term as NamedNode
    }
    return term
}

export function namedNode(value: string): NamedNode {
    return makeNamedNode($oxigraph.namedNode(value)) as NamedNode
}

export function isNamedNode(term: unknown): boolean {
    // @ts-expect-error: term is of unknown type
    return !!term.termType && term.termType === 'NamedNode'
}

//==============================================================================

export type SubjectType = BlankNode | NamedNode | $oxigraph.Quad | $oxigraph.Variable
export type PredicateType = NamedNode | $oxigraph.Variable
export type ObjectType = BlankNode | Literal | NamedNode | $oxigraph.Quad | $oxigraph.Variable

export interface Statement extends $oxigraph.Quad {
    subject: SubjectType
    predicate: PredicateType
    object: ObjectType
}

function makeStatement(quad: $oxigraph.Quad): Statement {
    return {
        graph: makeNamedNode(quad.graph),
        object: makeNamedNode(quad.object),
        predicate: makeNamedNode(quad.predicate),
        subject: makeNamedNode(quad.subject),
        termType: quad.termType,
        value: quad.value
    } as Statement
}

//==============================================================================

export type ContentType = string

export const TurtleContentType: ContentType = 'text/turtle'

//==============================================================================
//==============================================================================

import { BaseStore } from './store'

//==============================================================================

export class RdfStore extends BaseStore {
    #rdfStore: $oxigraph.Store

    constructor(documentUri: string = '') {
        super(documentUri)
        this.#rdfStore = new $oxigraph.Store()
    }

    statements(graph: NamedNode | null = null): Statement[] {
        return this.statementsMatching(null, null, null, graph)
    }

    add(s: SubjectType, p: PredicateType, o: ObjectType, g: NamedNode | null = null): Statement {
        const statement = $oxigraph.quad(s, p, o, g || $oxigraph.defaultGraph())
        this.#rdfStore.add(statement)
        return makeStatement(statement)
    }

    contains(
        s: SubjectType | null = null,
        p: PredicateType | null = null,
        o: ObjectType | null = null,
        g: NamedNode | null = null
    ): boolean {
        return this.#rdfStore.match(s, p, o, g || $oxigraph.defaultGraph()).length > 0
    }

    load(rdf: string, contentType: ContentType = TurtleContentType, graph: NamedNode | null = null) {
        this.#rdfStore.load(rdf, {
            format: contentType,
            base_iri: this.documentUri,
            to_graph_name: graph || $oxigraph.defaultGraph()
        })
    }

    removeStatements(
        s: SubjectType | null = null,
        p: PredicateType | null = null,
        o: ObjectType | null = null,
        g: NamedNode | null = null
    ) {
        const statements = this.#rdfStore.match(s, p, o, g || $oxigraph.defaultGraph())
        for (const statement of statements) {
            this.#rdfStore.delete(statement)
        }
    }

    async serialise(
        contentType: ContentType = TurtleContentType,
        namespaces: Record<string, string> = {},
        graph: NamedNode | null = null
    ): Promise<string> {
        if (contentType === TurtleContentType) {
            const quads = this.#rdfStore.match(null, null, null, graph || $oxigraph.defaultGraph())
            const turtle = await prettyTurtle(quads, {
                format: 'text/turtle',
                prefixes: Object.assign({ '': `${this.documentUri}#` }, namespaces),
                baseIri: this.documentUri,
                explicitBaseIRI: true,
                compact: false,
                ordered: true
            })
            return turtle.replaceAll(this.documentUri, '')
        } else {
            return this.#rdfStore.dump({
                format: contentType,
                from_graph_name: graph || $oxigraph.defaultGraph()
            })
        }
    }

    sparqlQuery(sparql: string, all_graphs: boolean = false): Map<string, $oxigraph.Term>[] {
        try {
            const results = this.#rdfStore.query(sparql, {
                use_default_graph_as_union: all_graphs
            }) as Map<string, $oxigraph.Term>[]
            for (const result of results) {
                for (const term of result.values()) {
                    makeNamedNode(term)
                }
            }
            return results
        } catch (error) {
            console.log(`Error parsing SPARQL: ${(<Error>error).message} ${sparql}`)
            let inLib = true
            for (const location of (<Error>error).stack!.split('\n')) {
                if (inLib) {
                    inLib = location.indexOf('RdfStore.sparqlQuery') < 0
                } else {
                    console.log(location)
                }
            }
        }
        return []
    }

    statementsMatching(
        s: SubjectType | null = null,
        p: PredicateType | null = null,
        o: ObjectType | null = null,
        g: NamedNode | null = null
    ): Statement[] {
        const statements: $oxigraph.Quad[] = this.#rdfStore.match(s, p, o, g || $oxigraph.defaultGraph())
        return statements.map((s) => makeStatement(s))
    }

    subjectsOfType(parentType: NamedNode): [SubjectType, NamedNode][] {
        return this.sparqlQuery(
            `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?s ?t WHERE {
    ?s rdf:type/rdfs:subClassOf* <${parentType.uri}> .
    ?s rdf:type ?t .
  } ORDER BY ?s`,
            true
        ).map((r) => [r.get('s'), r.get('t')])
    }
}

//==============================================================================
//==============================================================================
