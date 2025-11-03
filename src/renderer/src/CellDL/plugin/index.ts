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

import * as $rdf from '@editor/metadata'

import type { CellDLObject } from '@editor/celldlObjects'
import type { ObjectTemplate } from '@editor/components'

//==============================================================================

interface ComponentTemplate extends ObjectTemplate {
    id: $rdf.NamedNode
}

interface Plugin {
    pluginId: $rdf.NamedNode
    rdfDefinition: string // used by Manager
    title: string
    templates: ComponentTemplate[]

    makeObject(tpl: ComponentTemplate): CellDLObject

    xxxMethod: (obj, ...args) => void
}

//==============================================================================

/*
General diagram code will load metadata into a RdfStore (after checking
that it's valid CellDL) and load and display SVG. SVG elements, identified
by their `id`, have RDF statements made about them.

Need to identify each SVG element (CellDL element) with a plugin.


diagram needs to know about plugins

can we query over all subjects in diagram's metadata


PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ed: <http://celldl.org/namespaces/editor#>
PREFIX celldl: <http://celldl.org/ontologies/celldl#>

SELECT  ?s ?bgt ?t ?plugin WHERE {
    ?s rdf:type/rdfs:subClassOf* celldl:Component .
    ?s rdf:type ?bgt .
    ?s rdf:type/rdfs:subClassOf* ?t .
    ?t ed:definedBy ?plugin .
  }





*/

const PLUGIN_NS = $rdf.Namespace('https://celldl.org/editor/namespaces/plugin#')

/*
function pluginMethodWrapper(_managerMethod: any, context: ClassMethodDecoratorContext)
{
    const methodName = String(context.name);

    function pluginMethod(this: any, obj, ...args: any[])
    {
        const tpl = this.#templates.get(obj.templateId)
        if (tpl) {
            return tpl[0][methodName](obj, ...args)
        }
    }
    return pluginMethod;
}
*/

class ComponentManager {
    static #instance: ComponentManager | null = null
    #templates: Map<$rdf.NamedNode, [Plugin, ComponentTemplate]> = new Map()
    #plugins: Map<$rdf.NamedNode, Plugin> = new Map()

    #kb: $rdf.RdfStore = new $rdf.RdfStore('')

    private constructor() {
        if (ComponentManager.#instance) {
            throw new Error('Use `ComponentManager.instance` instead of `new`')
        }
        ComponentManager.#instance = this
    }

    static get instance() {
        //===================
        return ComponentManager.#instance ?? (ComponentManager.#instance = new ComponentManager())
    }

    get plugins(): Plugin[] {
        //=====================
        return [...this.plugins.values()]
    }

    addPlugin(plugin: Plugin) {
        //=======================
        if (!this.#plugins.has(plugin.pluginId)) {
            this.#plugins.set(plugin.pluginId, plugin)
            this.#kb.load(plugin.rdfDefinition, $rdf.TurtleContentType, plugin.pluginId)
            for (const template of plugin.templates) {
                this.#templates.set(template.id, [plugin, template])
            }
        }
    }

    deletePlugin(pluginId: $rdf.NamedNode) {
        //====================================
        const plugin = this.#plugins.get(pluginId)
        if (plugin) {
            for (const template of plugin.templates) {
                this.#templates.delete(template.id)
            }
            this.#plugins.delete(pluginId)
            this.#kb.removeStatements(null, null, null, pluginId)
        }
    }

    xxxMethod(objectInstance, ...args) {
        const pluginTemplate = this.#templates.get(objectInstance.templateId)
        if (pluginTemplate) {
            return pluginTemplate[0].xxxMethod(objectInstance, ...args)
        }
    }
}

//==============================================================================

export const componentManager = ComponentManager.instance

//==============================================================================
/*

* from manager either get:
    * a list of plugins and then from each plugin get a list of components (templates)
    * or simply a list of components
* given a component template need to be



*/
//==============================================================================

// this could (should?) also be a singleton...

// fetch ontology and templates

// namespaces used by plugin

const RELATIONSHIPS = `
    bg:BondElement
        plugin:definedBy 'BG-RDF' ;   # autogenerate ?
        rdfs:subClassOf celldl:Component .
    bg:JunctionStructure
        plugin:definedBy 'BG-RDF' ;
        rdfs:subClassOf celldl:Component .
    bg:PowerBond rdfs:subClassOf
        plugin:definedBy 'BG-RDF' ;
        celldl:Connection .
`

export class BGRDFPlugin implements Plugin {
    title = 'BG-RDF'
    pluginId = PLUGIN_NS('BG-RDF')
    rdfDefinition = `
        // to include ontology...
    `
}

/*

Or in loaded RDF + subclass relationships from each plugin:

Query:
```
    ?s rdf:type/rdfs:subClassOf* celldl:Component .
    ?s rdf:type ?t .
    ?t definedBy ?plugin
```

Plugin definition:
```
    bg:BondElement
        definedBy bgPlugin ;
        rdfs:subClassOf celldl:Component .
```

BG templates (loaded as part of plugin definition):
```
    bg:Capacitor
        rdfs:subClassOf bg:BondElement .
```

In SVG metadata:
```
    q_1:
        a bg:Capacitor .
```

@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix bg: <http://celldl.org/ontologies/bond-graph#> .
@prefix celldl: <http://celldl.org/ontologies/celldl#> .

@prefix graph: <http://celldl.org/ontologies/graph#> .

@prefix : <#> .

graph:plugin {
    bg:BondElement
        definedBy bgPlugin ;
        rdfs:subClassOf celldl:Component .

    bg:Capacitor
        rdfs:subClassOf bg:BondElement .
}

q_1:
    a bg:Capacitor .


PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ed: <http://celldl.org/namespaces/editor#>
PREFIX celldl: <http://celldl.org/ontologies/celldl#>

SELECT  ?s ?bgt ?t ?plugin WHERE {
    ?s rdf:type/rdfs:subClassOf* celldl:Component .
    ?s rdf:type ?bgt .
    ?s rdf:type/rdfs:subClassOf* ?t .
    ?t ed:definedBy ?plugin .
  }


Plugin (with ID) provides:

1) sub-class statements to define how elements relate to CellDL:

   bg:BondElement rdfs:subClassOf celldl:Component .
   bg:JunctionStructure rdfs:subClassOf celldl:Component .
   bg:PowerBond rdfs:subClassOf celldl:Connection .

2) for a given SVG element, get attributes from RDF

3) attributes could be in different categories, e.g. `metadata`
   and `properties`.

4) for a category and element class, provide HTML to display
   and modify attributes (using HTML templates, e.g. `Section`)

5) need to ditinguish display (readonly) and edit.

6) update RDF when attributes have changed.

7) provide an updated SVG element when attributes have changed.

8) check if two elements can be connected.


BG-RDF plugin can use its component templates to provide attribute information.


Need to provide svg icons with labels and descriptions...

class CDObject
{
    plugin()
}

cdobject.plugin.method() --> cdobject.plugin.method(cdobject) --> method(cdobject)
cdobject.plugin().method() --> cdobject.plugin.method(cdobject) --> method(cdobject)


plugin to know about its objects and manage their plugin specific state -- a plugin mixin...


or

    pluginManager.componentMethod(cdobject)

        look up object to find its plugin and call plugin.componentMethod(cdobject)



        const pluginTemplate = this.#templates.get(objectInstance.templateId)
        if (pluginTemplate) {
            return pluginTemplate[0]['xxxMethod'](objectInstance, ...args)
        }

*/

/********
import {NamedNode} from '@renderer/metadata'

//==============================================================================

interface ComponentPlugin
{
    celldlDocumentClass: NamedNode
    celldlComponentClasses?: NamedNode[]
    celldlSourceProperty?: NamedNode
    celldlTargetProperty?: NamedNode
}

//==============================================================================
//==============================================================================

class CelldlComponentPlugin implements ComponentPlugin
{
    celldlDocumentClass = CELLDL_NAMESPACE('Document')
    celldlComponentClasses = [
        CELLDL_NAMESPACE('Component'),
    ]
    celldlSourceProperty = CELLDL_NAMESPACE('hasSource')
    celldlTargetProperty = CELLDL_NAMESPACE('hasTarget')
}

//==============================================================================
//==============================================================================

const BGF_NAMESPACE_URI = 'https://bg-rdf.org/ontologies/bondgraph-framework#'
const BGF_NAMESPACE = Namespace(BGF_NAMESPACE_URI)

class BondgraphFrameworkPlugin implements ComponentPlugin
{
    celldlDocumentClass = BGF_NAMESPACE('BondgraphModel')
    celldlComponentClasses = [
        BGF_NAMESPACE('ElectricalResistanceNode'),
        BGF_NAMESPACE('ElectricalStorageNode'),
        BGF_NAMESPACE('VoltageSource'),
    ]
    celldlSourceProperty = BGF_NAMESPACE('hasSource')
    celldlTargetProperty = BGF_NAMESPACE('hasTarget')
}

//==============================================================================
//==============================================================================
*******/
