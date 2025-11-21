#!bin/sh

mkdir -m 755 -p ./src/renderer/public/oxigraph
cp ./node_modules/oxigraph/web* ./src/renderer/public/oxigraph

mkdir -m 755 -p ./src/renderer/public/bg-rdf
cp ./BG-RDF/schema/ontology.ttl ./src/renderer/public/bg-rdf
mkdir -m 755 -p ./src/renderer/public/bg-rdf/templates
cp ./BG-RDF/templates/*.ttl ./src/renderer/public/bg-rdf/templates

mkdir -m 755 -p ./src/renderer/public/pyodide
cp ./node_modules/pyodide/* ./src/renderer/pyodide/wheels
mkdir -m 755 -p ./src/renderer/public/bg-rdf/templates
cp ./python/wheels/*.whl ./src/renderer/public/pyodide/wheels
