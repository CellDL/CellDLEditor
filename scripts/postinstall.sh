#!bin/sh

cp ./node_modules/oxigraph/web* ./src/renderer/public/oxigraph

cp ./BG-RDF/schema/ontology.ttl ./src/renderer/src/assets/bg-rdf
cp ./BG-RDF/templates/*.ttl ./src/renderer/src/assets/bg-rdf/templates
