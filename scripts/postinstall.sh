#!bin/sh

mkdir -m 755 -p ./src/renderer/public/oxigraph
cp -p ./node_modules/oxigraph/web* ./src/renderer/public/oxigraph

# Copy pyodide into public
mkdir -m 755 -p ./src/renderer/public/pyodide
cp -p ./node_modules/pyodide/* ./src/renderer/public/pyodide

# Copy Python packages into public
mkdir -m 755 -p ./src/renderer/public/python/wheels
cp -p ./python/wheels/*.whl ./src/renderer/public/python/wheels
mkdir -m 755 -p ./src/renderer/public/bg-rdf
cp -p ./BG-RDF/schema/ontology.ttl ./src/renderer/public/bg-rdf
mkdir -m 755 -p ./src/renderer/public/bg-rdf/templates
cp -p ./BG-RDF/templates/*.ttl ./src/renderer/public/bg-rdf/templates
