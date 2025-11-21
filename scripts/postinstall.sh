#!bin/sh

mkdir -m 755 -p ./src/renderer/public/oxigraph
cp ./node_modules/oxigraph/web* ./src/renderer/public/oxigraph

mkdir -m 755 -p ./src/renderer/public/bg-rdf
mkdir -m 755 -p ./src/renderer/public/bg-rdf/templates
cp ./BG-RDF/schema/ontology.ttl ./src/renderer/public/bg-rdf
cp ./BG-RDF/templates/*.ttl ./src/renderer/public/bg-rdf/templates
