#!bin/sh

# Copy oxigraph into assets
mkdir -m 755 -p ./src/renderer/src/assets/oxigraph
cp -p ./node_modules/oxigraph/web* ./src/renderer/src/assets/oxigraph

# Copy pyodide into public
mkdir -m 755 -p ./src/renderer/public/pyodide
cp -p ./node_modules/pyodide/* ./src/renderer/public/pyodide

# Copy Python packages into public
mkdir -m 755 -p ./src/renderer/public/python/wheels
cp -p ./python/wheels/*.whl ./src/renderer/public/python/wheels

# Copy BG-RDF into assets for importing into `bondgraph` plugin
mkdir -m 755 -p ./src/renderer/src/assets/bg-rdf
cp -p ./BG-RDF/schema/ontology.ttl ./src/renderer/src/assets/bg-rdf
mkdir -m 755 -p ./src/renderer/src/assets/bg-rdf/templates
cp -p ./BG-RDF/templates/*.ttl ./src/renderer/src/assets/bg-rdf/templates

# Copy BG-RDF into public for loading by `bg2cellml` Python code
mkdir -m 755 -p ./src/renderer/public/bg-rdf
cp -p ./BG-RDF/schema/ontology.ttl ./src/renderer/public/bg-rdf
mkdir -m 755 -p ./src/renderer/public/bg-rdf/templates
cp -p ./BG-RDF/templates/*.ttl ./src/renderer/public/bg-rdf/templates
