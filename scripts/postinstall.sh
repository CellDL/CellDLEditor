#!bin/sh

# We want directories to have a mode of 755
umask 022

# Copy BG-RDF into assets for importing into `bondgraph` plugin
mkdir -p ./src/renderer/src/assets/bg-rdf
cp -p ./BG-RDF/schema/ontology.ttl ./src/renderer/src/assets/bg-rdf
mkdir -p ./src/renderer/src/assets/bg-rdf/templates
cp -p ./BG-RDF/templates/*.ttl ./src/renderer/src/assets/bg-rdf/templates

# Copy oxigraph into assets
mkdir -p ./src/renderer/src/assets/oxigraph
cp -p ./node_modules/oxigraph/web* ./src/renderer/src/assets/oxigraph

# Copy pyodide into assets
mkdir -p ./src/renderer/src/assets/pyodide
cp -p ./node_modules/pyodide/* ./src/renderer/src/assets/pyodide

# Copy Python packages into assets
mkdir -p ./src/renderer/src/assets/wheels
cp -p ./python/wheels/*.whl ./src/renderer/src/assets/wheels


# Copy BG-RDF into public for loading by `bg2cellml` Python code
mkdir -p ./src/renderer/public/bg-rdf
cp -p ./BG-RDF/schema/ontology.ttl ./src/renderer/public/bg-rdf
mkdir -p ./src/renderer/public/bg-rdf/templates
cp -p ./BG-RDF/templates/*.ttl ./src/renderer/public/bg-rdf/templates
