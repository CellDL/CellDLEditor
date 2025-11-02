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

export const LIBRARY_DESCRIPTION = `
    @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
    @prefix celldl: <http://celldl.org/ontologies/celldl#>.
    @prefix bg: <http://celldl.org/ontologies/bond-graph#>.

    _:Capacitance
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:Capacitance;
        celldl:objectClass celldl:Component;
        celldl:maxConnections 1;
        rdfs:label "Capacitance";
        celldl:hasDomains [
            celldl:domain bg:Biochemical;
            rdfs:label "Concentration";
            bg:element "Concentration"
        ], [
            celldl:domain bg:Electrical;
        ], [
            celldl:domain bg:Mechanical;
        ];
        celldl:hasConstraint [
            a celldl:Constraint;
            celldl:allowedConnector
                bg:Converter,
                bg:ZeroNode
        ];
        bg:element "Capacitance" .

    _:Inductance
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:Inductance;
        celldl:objectClass celldl:Component;
        celldl:maxConnections 1;
        rdfs:label "Inductance";
        celldl:domain bg:Electrical, bg:Mechanical;
        celldl:hasConstraint [
            a celldl:Constraint;
            celldl:allowedConnector
                bg:Converter,
                bg:ZeroNode
        ];
        bg:element "Inductance" .

    _:Converter
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:Converter;
        celldl:objectClass celldl:Conduit;
        celldl:maxConnections 1;
        rdfs:label "Converter";
        celldl:hasRole [
            a celldl:domainConverter;  ## ==> numPorts == 2
            rdfs:label ("Transformer" "Gyrator");
            bg:element ("Transformer" "Gyrator");
            celldl:definesComponent (bg:Transformer bg:Gyrator)
        ];
        celldl:hasConstraint [
            a celldl:Constraint;
            celldl:allowedConnector
                bg:OneNode,
                bg:OneResistanceNode,
                bg:Reaction,
                bg:ZeroNode,
                bg:ZeroStorageNode
        ] .

    _:Reaction
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:Reaction;
        celldl:objectClass celldl:Conduit;
        celldl:maxConnections 1;
        rdfs:label "Biochemical Reaction";
        celldl:domain bg:Biochemical;
        celldl:hasConstraint [
            a celldl:Constraint;
            celldl:allowedConnector
                bg:Converter,
                bg:OneNode,
                bg:OneResistanceNode,
                bg:ZeroNode,
                bg:ZeroStorageNode
        ];
        bg:element "Reaction" .

    _:Resistance
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:Resistance;
        celldl:objectClass celldl:Component;
        celldl:maxConnections 1;
        rdfs:label "Resistance";
        celldl:domain bg:Electrical, bg:Mechanical;
        celldl:hasConstraint [
            a celldl:Constraint;
            celldl:allowedConnector
                bg:Converter,
                bg:OneNode
        ];
        bg:element "Resistance" .

    _:one-node-constraint
        celldl:objectClass celldl:Constraint;
        celldl:allowedConnector
            bg:Inductance,
            bg:Converter,
            bg:Reaction,
            bg:Resistance,
            bg:ZeroNode,
            bg:ZeroStorageNode .

    _:zero-node-constraint
        a celldl:Constraint;
        celldl:allowedConnector
            bg:Capacitance,
            bg:Converter,
            bg:OneNode,
            bg:OneResistanceNode,
            bg:Reaction .

    _:OneNode
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:OneNode;
        celldl:objectClass celldl:Component;
        rdfs:label "One Node";
        celldl:domain bg:Biochemical, bg:Electrical, bg:Mechanical;
        celldl:hasConstraint _:one-node-constraint;
        bg:element "OneJunction" .

    _:OneResistanceNode
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:OneResistanceNode;
        celldl:objectClass celldl:Component;
        rdfs:label "One Resistance Node";
        celldl:domain bg:Electrical, bg:Mechanical;
        celldl:hasConstraint _:one-node-constraint;
        bg:element "Resistance" .

    _:ZeroNode
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:ZeroNode;
        celldl:objectClass celldl:Component;
        rdfs:label "Zero Node";
        celldl:domain bg:Biochemical, bg:Electrical, bg:Mechanical;
        celldl:hasConstraint _:zero-node-constraint;
        bg:element "ZeroJunction" .

    _:ZeroStorageNode
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:ZeroStorageNode;
        celldl:objectClass celldl:Component;
        rdfs:label "Zero Storage Node";
        celldl:hasDomains [
            celldl:domain bg:Biochemical;
            rdfs:label "Concentration";
            bg:element "Concentration"
        ], [
            celldl:domain bg:Electrical;
            rdfs:label "Capacitance";
            bg:element "Capacitance"
        ], [
            celldl:domain bg:Mechanical;
            rdfs:label "Capacitance";
            bg:element "Capacitance"
        ];
        celldl:hasConstraint _:zero-node-constraint .

    _:Connection
        a celldl:ComponentDefinition;
        celldl:definesComponent bg:Connection;
        celldl:objectClass celldl:Connection .
`

//==============================================================================
