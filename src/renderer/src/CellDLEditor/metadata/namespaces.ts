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

import { isNamedNode, namedNode, type NamedNode } from './rdfstore.ts'
import * as URI from './uris.ts'

//==============================================================================

export type NamespaceType = (_: string) => NamedNode

export function Namespace(nsuri: string): NamespaceType {
    return (ln: string): NamedNode => namedNode(nsuri + (ln || ''))
}

//==============================================================================

export const CELLDL_NAMESPACE = Namespace(URI.CELLDL_NAMESPACE_URI)

export const CELL_NAMESPACE = Namespace(URI.CELL_NAMESPACE_URI)
export const BG_NAMESPACE = Namespace(URI.BG_NAMESPACE_URI)
export const FC_NAMESPACE = Namespace(URI.FC_NAMESPACE_URI)

export const DCT_NAMESPACE = Namespace(URI.DCT_NAMESPACE_URI)
export const OWL_NAMESPACE = Namespace(URI.OWL_NAMESPACE_URI)
export const RDF_NAMESPACE = Namespace(URI.RDF_NAMESPACE_URI)
export const RDFS_NAMESPACE = Namespace(URI.RDFS_NAMESPACE_URI)
export const XS_NAMESPACE = Namespace(URI.XS_NAMESPACE_URI)

//==============================================================================

export function curieSuffix(NS: NamespaceType, term: string | NamedNode): string {
    const curie: string = isNamedNode(term) ? (<NamedNode>term).uri : <string>term
    const fullUri = expandCurie(curie)
    const nsUri = NS('').uri
    if (fullUri.startsWith(nsUri)) {
        return fullUri.slice(nsUri.length)
    }
    return curie
}

//==============================================================================

const declaredNamespaces = Object.assign({}, URI.CELLDL_NAMESPACE_DECLARATIONS,
                                             URI.WEB_NAMESPACE_DECLARATIONS)

export function getCurie(term: string | NamedNode): string {
    const fullUri: string = isNamedNode(term) ? (<NamedNode>term).uri : <string>term
    for (const [prefix, nsUri] of Object.entries(declaredNamespaces)) {
        if (fullUri.startsWith(nsUri)) {
            return `${prefix}:${fullUri.slice(nsUri.length)}`
        }
    }
    return fullUri
}

//==============================================================================

const declaredNamespacesMap = new Map(Object.entries(declaredNamespaces))

export function expandCurie(curie: string): string {
    const parts = curie.split(':')
    // @ts-expect-error: `parts[0]` is defined
    if (parts.length > 1 && declaredNamespacesMap.has(parts[0])) {
        // @ts-expect-error: `parts[0]` is defined
        return `${declaredNamespacesMap.get(parts[0])}${parts.slice(1).join(':')}`
    }
    return curie
}

//==============================================================================
