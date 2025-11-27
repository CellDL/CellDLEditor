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

import { type PyodideAPI } from '@pyodide/pyodide'

//==============================================================================

import * as $rdf from '@editor/metadata/index'

//==============================================================================

const rdfModule = {
    blankNode: $rdf.blankNode,
    literal: $rdf.literal,
    namedNode: $rdf.namedNode,

    isBlankNode: $rdf.isBlankNode,
    isLiteral: $rdf.isLiteral,
    isNamedNode: $rdf.isNamedNode,

    RdfStore: function(documentUri: string): $rdf.RdfStore {
        return new $rdf.RdfStore(documentUri)
    }
}

//==============================================================================

export default function register(name: string, pyodide: PyodideAPI) {
    pyodide.registerJsModule(name, rdfModule)
}

//==============================================================================

const testRdf = `
import rdf

node = rdf.namedNode('https://celldl.org/example#node')

print('node', node, rdf.isBlankNode(node), rdf.isLiteral(node), rdf.isNamedNode(node))
print()

#===============================================

ttl = '''@prefix : <#> .
@prefix bgf: <https://bg-rdf.org/ontologies/bondgraph-framework#> .
@prefix cdt: <https://w3id.org/cdt/> .
@prefix celldl: <http://celldl.org/ontologies/celldl#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix tpl: <https://bg-rdf.org/templates/> .

<> a celldl:Document, bgf:BondgraphModel ;
  <http://purl.org/dc/terms/created> "2025-11-20T00:14:00.859Z" ;
  <http://purl.org/dc/terms/modified> "2025-11-20T01:04:00.446Z" ;
  owl:versionInfo "1.0" ;
  bgf:usesTemplate tpl:electrical.ttl ;
  bgf:hasBondElement :ID-00000001, :ID-00000003, :ID-00000004 .

:ID-00000001 a celldl:Component, bgf:VoltageSource ;
  bgf:hasLocation "j" ;
  bgf:hasSpecies "i" ;
  bgf:hasSymbol "v_in" ;
  bgf:hasValue "10 V"^^cdt:ucum .
'''

#===============================================

store = rdf.RdfStore('https://bg-rdf.org/store')
store.load(ttl)

statements = store.statements()
print('Statements:')
for s in statements:
    print(f'[{s.subject.toString()}, {s.predicate.toString()}, {s.object.toString()}]')

print()
hasBondElement = rdf.namedNode('https://bg-rdf.org/ontologies/bondgraph-framework#hasBondElement')
bondElements = store.statementsMatching(None, hasBondElement, None)
print('Bond elements:')
for s in bondElements:
    print(f'[{s.subject.toString()}, {s.predicate.toString()}, {s.object.toString()}]')

`

export async function pythonRdfTest(pyodide: PyodideAPI): Promise<any> {
    return pyodide.runPythonAsync(testRdf)
}

//==============================================================================
