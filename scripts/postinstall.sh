#!bin/sh

# We want directories to have a mode of 755
umask 022

# Copy BG-RDF into assets for importing into `bondgraph` plugin
mkdir -p ./src/renderer/src/assets/bg-rdf
cp -p ./BG-RDF/schema/ontology.ttl ./src/renderer/src/assets/bg-rdf
mkdir -p ./src/renderer/src/assets/bg-rdf/templates
cp -p ./BG-RDF/templates/*.ttl ./src/renderer/src/assets/bg-rdf/templates
