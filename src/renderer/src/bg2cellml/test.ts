
/** PYTHON TESTING **/


// @ts-expect-error:
const pyodide = globalThis.pyodide
console.log('PYE', pyodide)

if (pyodide) {

async function helloPython(code: string) {
    return pyodide.runPythonAsync(code)
}

const expr = '1 + 2'

helloPython(expr).then(r => console.log(`Python says: ${expr} = ${r}`))


const pythonWheels = [
    'micropip-0.11.0-py3-none-any.whl',
    'lark-1.3.1-py3-none-any.whl',
    'flexcache-0.4.dev0+gade5bc0f5.d20251121-py3-none-any.whl',
    'flexparser-0.5.dev0+gac028f936.d20251121-py3-none-any.whl',
    'pint-0.25.3.dev0+g84762624b.d20251121-py3-none-any.whl',
    'ucumvert-0.3.1.dev0+ge3d35ec9b.d20251121-py3-none-any.whl',
    'bg2cellml-0.8.0-py3-none-any.whl',
]

async function runStemmer() {
    // Make packages available for importing from Python

    // From '/python/wheels' under `/public`...

    await pyodide.loadPackage("https://files.pythonhosted.org/packages/cd/54/ca4cf05534c71391c790d14abcdd007e961e773d8c40244c8328a63065cd/micropip-0.11.0-py3-none-any.whl");


    const micropip = pyodide.pyimport("micropip");
    await micropip.install('snowballstemmer');

    return pyodide.runPython(`
        import snowballstemmer
        stemmer = snowballstemmer.stemmer('english')
        print(stemmer.stemWords('go goes going gone'.split()))
    `);
}

runStemmer().then(() => console.log(`Stemmer ran...`))

const rdf = {
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

pyodide.registerJsModule("rdf", rdf)

async function rdfTest() {
    return pyodide.runPython(`
import rdf

node = rdf.namedNode('https://celldl.org/example#node')

print('node', node, rdf.isBlankNode(node), rdf.isLiteral(node), rdf.isNamedNode(node))
print()


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
`)
}


rdfTest().then(() => console.log(`RDF test...`))


async function load_bg2cellml_js() {
    const micropip = pyodide.pyimport("micropip")
    await micropip.install('/wheels/bg2cellml-0.7.3-py3-none-any.whl');

    return pyodide.runPython(`
        import bg2cellml.version as version
        print('bg2cellml version', version.__version__)
    `)
    console.log('bg2cellml loaded!')
}

}
/** END PYTHON TESTING **/

