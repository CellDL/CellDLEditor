//==============================================================================

export const CELLDL_NAMESPACE_URI = 'http://celldl.org/ontologies/celldl#'

export const CELL_NAMESPACE_URI = 'http://celldl.org/ontologies/cell-components#'
export const BG_NAMESPACE_URI = 'http://celldl.org/ontologies/bond-graph#'
export const FC_NAMESPACE_URI = 'http://celldl.org/ontologies/functional-connectivity#'

export const DCT_NAMESPACE_URI = 'http://purl.org/dc/terms/'
export const OWL_NAMESPACE_URI = 'http://www.w3.org/2002/07/owl#'
export const RDF_NAMESPACE_URI = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
export const RDFS_NAMESPACE_URI = 'http://www.w3.org/2000/01/rdf-schema#'
export const XS_NAMESPACE_URI = 'http://www.w3.org/2001/XMLSchema#'

export const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg'

//==============================================================================

export const CELLDL_NAMESPACE_DECLARATIONS = {
    cell: CELL_NAMESPACE_URI,
    celldl: CELLDL_NAMESPACE_URI,
    bg: BG_NAMESPACE_URI,
    fc: FC_NAMESPACE_URI
}

export const WEB_NAMESPACE_DECLARATIONS = {
    dcterms: DCT_NAMESPACE_URI,
    owl: OWL_NAMESPACE_URI,
    rdf: RDF_NAMESPACE_URI,
    rdfs: RDFS_NAMESPACE_URI,
    svg: `${SVG_NAMESPACE_URI}/`,
    xsd: XS_NAMESPACE_URI
}

//==============================================================================
