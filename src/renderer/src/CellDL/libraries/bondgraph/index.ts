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

//==============================================================================

import * as $rdf from '@renderer/metadata'

import type { CellDLObject } from '@renderer/celldlObjects'
import { BG_NAMESPACE, CELLDL_NAMESPACE, MetadataPropertiesMap, type NamedNode } from '@renderer/metadata'
import { arrowMarkerDefinition } from '@renderer/styles/stylesheet'

import type { Constructor, StringProperties } from '@renderer/types'

//==============================================================================

import { type TemplateProperties, ComponentTemplate } from '@renderer/libraries/component'
import LatexMath from '@renderer/libraries/mathjax'
import type { LibraryDefinition } from '@renderer/libraries/manager'

//==============================================================================

import { ModelValue } from './libbondgraph/model'

//==============================================================================

const ICON_BORDER = '2px'
const ICON_PADDING = '3px'
const ICON_MIN_WIDTH = '3.5ex'
const ICON_MIN_HEIGHT = '4ex'
const ICON_VERTICAL_ALIGN = '-1.5ex'
const ICON_RADIUS = '6px'

const MIN_BORDER = '0.2px'
const MIN_BORDER_COLOUR = 'grey'

//==============================================================================

type ElementColour = {
    text: string
    background: string
    border?: string
}

const SCALE_COLOUR: ElementColour = {
    text: '#7030A0',
    background: '#C1C1FA'
}

const FLOW_COLOUR: ElementColour = {
    text: '#00B050',
    background: '#E2F0D9'
}
const ZERO_STORAGE_COLOUR: ElementColour = {
    text: FLOW_COLOUR.text,
    background: FLOW_COLOUR.background,
    border: 'red'
}

const POTENTIAL_COLOUR: ElementColour = {
    text: '#FF0909',
    background: '#FBE4D5'
}

const REACTION_COLOUR: ElementColour = {
    text: '#72329F',
    background: '#FFD966'
}

const RESISTANCE_COLOUR: ElementColour = {
    text: '#444',
    background: REACTION_COLOUR.background
}
const ONE_RESISTANCE_COLOUR: ElementColour = {
    text: RESISTANCE_COLOUR.text,
    background: RESISTANCE_COLOUR.background,
    border: 'green'
}

const UNITS_COLOUR = {
    text: '#444',
    background: '#DDD'
}

//const MOLE_TRANSFER_COLOUR = '#4F71BE'
//const CHARGE_TRANSFER_COLOUR = '#DE8344'

//==============================================================================

class BondgraphElement {
    get species() {
        return ''
    }

    get hasUnits() {
        return false
    }

    get location() {
        return ''
    }

    get settings(): StringProperties {
        return {}
    }

    get scale() {
        return ''
    }

    get units() {
        return ''
    }

    get colour(): ElementColour {
        return {
            text: 'black',
            background: 'transparent'
        }
    }

    copy(): BondgraphElement {
        return new BondgraphElement()
    }

    getLatex(): string {
        return ''
    }

    update(_settings: StringProperties): boolean {
        return false
    }
}

//==============================================================================

function unitsToLatex(units: string, includeUnits: boolean = true): string {
    //======================================================================
    return `${includeUnits && units ? `\\textcolor{${UNITS_COLOUR.text}}{\\text{\\small (${units})}}` : ''}`
}

//==============================================================================

class ScaleElement extends BondgraphElement {
    #scale: string

    constructor(scale: string = '') {
        super()
        this.#scale = scale.trim()
    }

    get settings() {
        return {
            scale: this.#scale
        }
    }

    copy(): ScaleElement {
        //==================
        return new ScaleElement(this.#scale)
    }

    getLatex(): string {
        //================
        return this.#scale
    }

    update(settings: StringProperties): boolean {
        //==========================================
        if ('scale' in settings && settings.scale !== this.#scale) {
            this.#scale = settings.scale
            return true
        }
        return false
    }
}

//==============================================================================

class VariableElement extends BondgraphElement {
    #base: string
    #species: string
    #location: string
    #units: string
    #colour: string

    constructor(base: string, species: string = '', location: string = '', units: string = '', colour: string = '') {
        super()
        this.#base = base.trim()
        this.#species = species.trim()
        this.#location = location.trim()
        this.#units = units.trim()
        this.#colour = colour.trim()
    }

    get hasUnits() {
        return this.#units !== ''
    }

    get species() {
        return this.#species
    }

    get location() {
        return this.#location
    }

    get units() {
        return this.#units
    }

    get settings() {
        return {
            species: this.#species,
            location: this.#location,
            units: this.#units
        }
    }

    copy(): VariableElement {
        //=====================
        return new VariableElement(this.#base, this.#species, this.#location, this.#units, this.#colour)
    }

    getLatex(textMode: boolean = false): string {
        //=======================================
        return `${
            this.#colour ? `\\textcolor{${this.#colour}}` : ''
        }{${textMode ? `\\text{${this.#base}}` : this.#base}${this.#species ? `^{${this.#species}}` : ''}${
            this.#location ? `_{${this.#location}}` : ''
        }}`
    }

    update(settings: StringProperties): boolean {
        //==========================================
        let changed = false
        if ('species' in settings && settings.species !== this.#species) {
            this.#species = settings.species
            changed = true
        }
        if ('location' in settings && settings.location !== this.#location) {
            this.#location = settings.location
            changed = true
        }
        if ('units' in settings && settings.units !== this.#units) {
            this.#units = settings.units
            changed = true
        }
        return changed
    }
}

//==============================================================================

class FixedElement extends BondgraphElement {
    #base: string
    #location: string

    constructor(base: string, location: string = '') {
        super()
        this.#base = base
        this.#location = location
    }

    get settings() {
        return {
            location: this.#location
        }
    }

    get location() {
        return this.#location
    }

    copy(): FixedElement {
        //==================
        return new FixedElement(this.#base, this.#location)
    }

    getLatex(): string {
        //================
        return `\\text{${this.#base}}${this.#location ? `_{${this.#location}}` : ''}`
    }

    update(settings: StringProperties): boolean {
        //=========================================
        if ('location' in settings && settings.location !== this.#location) {
            this.#location = settings.location
            return true
        }
        return false
    }
}

//==============================================================================

class NodeElement extends BondgraphElement {
    #variableElement: VariableElement
    #scaleElement: ScaleElement

    constructor(variable: VariableElement, scale: ScaleElement | null = null) {
        super()
        this.#variableElement = variable
        this.#scaleElement = scale ? scale : new ScaleElement()
    }

    get scaleElement() {
        return this.#scaleElement
    }

    get units() {
        return this.#variableElement.units
    }

    get species() {
        return this.#variableElement.species
    }

    get location() {
        return this.#variableElement.location
    }

    get variableElement() {
        return this.#variableElement
    }

    get hasUnits() {
        return this.#variableElement.hasUnits
    }

    get settings() {
        const settings = Object.assign({}, this.#variableElement.settings, this.#scaleElement.settings)
        return {
            species: settings.species,
            location: settings.location,
            scale: settings.scale,
            units: settings.units
        }
    }

    copy(): NodeElement {
        //=================
        return new NodeElement(this.#variableElement.copy(), this.#scaleElement ? this.#scaleElement.copy() : null)
    }

    getLatex(textMode: boolean = false): string {
        //=======================================
        return `${
            this.#scaleElement.getLatex() ? `\\textcolor{${SCALE_COLOUR.text}}{${this.#scaleElement.getLatex()}}` : ''
        }${this.#variableElement.getLatex(textMode)}`
    }

    update(settings: StringProperties): boolean {
        //==========================================
        const update_species = this.#variableElement.update({
            species: settings.species || '',
            location: settings.location || '',
            units: settings.units || ''
        })
        const update_scale = this.#scaleElement.update({
            scale: settings.scale || ''
        })
        return update_species || update_scale
    }
}

//==============================================================================

class Converter extends BondgraphElement {
    static readonly propertyNames = ['scale']

    #scaleElement: ScaleElement

    constructor(scale: ScaleElement | null = null) {
        super()
        this.#scaleElement = scale ? scale : new ScaleElement('k')
    }

    get factor() {
        return this.#scaleElement
    }

    get colour() {
        return SCALE_COLOUR
    }

    get scaleElement() {
        return this.#scaleElement
    }

    get settings(): StringProperties {
        return this.#scaleElement.settings
    }

    copy(): Converter {
        //================
        return new Converter(this.#scaleElement.copy())
    }

    getLatex(): string {
        //================
        return `\\textcolor{${SCALE_COLOUR.text}}{${this.#scaleElement.getLatex()}}`
    }

    update(settings: StringProperties): boolean {
        //==========================================
        if ((settings.scale || '') === '') {
            throw new Error('Please set a value')
        }
        return this.#scaleElement.update(settings)
    }
}

//==============================================================================
//==============================================================================

class Potential extends VariableElement {
    static readonly propertyNames = ['species', 'location', 'units']

    constructor(species: string = 'i', location: string = 'j', units: string = '') {
        super('u', species, location, units, POTENTIAL_COLOUR.text)
    }

    copy(): Potential {
        //===============
        return new Potential(this.species, this.location, this.units)
    }
}

//==============================================================================

class ZeroNode extends NodeElement {
    static readonly propertyNames = ['species', 'location', 'units', 'scale']

    constructor(potential: Potential | null = null, scale: ScaleElement | null = null) {
        super(potential ? potential : new Potential(), scale)
    }

    get colour() {
        //==========
        return POTENTIAL_COLOUR
    }

    copy(): ZeroNode {
        //==============
        return new ZeroNode(this.variableElement.copy() as Potential, this.scaleElement.copy())
    }
}

//==============================================================================

class Capacitance extends NodeElement {
    static readonly propertyNames = ['species', 'location', 'units', 'scale']

    constructor(species: string = 'i', location: string = 'j', units: string = '', scale: ScaleElement | null = null) {
        super(new VariableElement('q', species, location, units, FLOW_COLOUR.text), scale)
    }

    get colour() {
        //==========
        return FLOW_COLOUR
    }

    copy(): Capacitance {
        //=================
        return new Capacitance(this.species, this.location, this.units, this.scaleElement.copy())
    }
}

//==============================================================================

class ZeroStorageNode extends NodeElement {
    static readonly propertyNames = ['species', 'location', 'units', 'scale']

    constructor(species: string = 'i', location: string = 'j', units: string = '', scale: ScaleElement | null = null) {
        super(new VariableElement('u', species, location, units, ZERO_STORAGE_COLOUR.text), scale)
    }

    get colour() {
        //==========
        return ZERO_STORAGE_COLOUR
    }

    copy(): ZeroStorageNode {
        //=====================
        return new ZeroStorageNode(this.species, this.location, this.units, this.scaleElement.copy())
    }
}

//==============================================================================
//==============================================================================

class Flow extends VariableElement {
    static readonly propertyNames = ['species', 'location', 'units']

    constructor(species: string = 'i', location: string = 'j', units: string = '') {
        super('v', species, location, units, FLOW_COLOUR.text)
    }

    copy(): Flow {
        //==========
        return new Flow(this.species, this.location, this.units)
    }
}

//==============================================================================

class OneNode extends NodeElement {
    static readonly propertyNames = ['species', 'location', 'units', 'scale']

    constructor(flow: Flow | null = null, scale: ScaleElement | null = null) {
        super(flow ? flow : new Flow(), scale)
    }

    get colour() {
        //==========
        return FLOW_COLOUR
    }

    copy(): OneNode {
        //=============
        return new OneNode(this.variableElement.copy() as Flow, this.scaleElement.copy())
    }
}

//==============================================================================

class Resistance extends FixedElement {
    static readonly propertyNames = ['location']

    constructor(location: string = 'n') {
        super('R', location)
    }

    get colour() {
        return RESISTANCE_COLOUR
    }

    copy(): Resistance {
        //================
        return new Resistance(this.location)
    }
}

//==============================================================================

class OneResistanceNode extends VariableElement {
    static readonly propertyNames = ['species', 'location', 'units']

    constructor(species: string = 'i', location: string = 'j', units: string = '') {
        super('v', species, location, units, ONE_RESISTANCE_COLOUR.text)
    }

    get colour() {
        //==========
        return ONE_RESISTANCE_COLOUR
    }

    copy(): OneResistanceNode {
        //=======================
        return new OneResistanceNode(this.species, this.location, this.units)
    }
}

//==============================================================================

class Inductance extends FixedElement {
    static readonly propertyNames = ['location']

    constructor(location: string = 'n') {
        super('L', location)
    }

    copy(): Inductance {
        //================
        return new Inductance(this.location)
    }
}

//==============================================================================
//==============================================================================

class Reaction extends VariableElement {
    // type, location
    static readonly propertyNames = ['type', 'location']

    constructor(type: string = 'i', location: string = 'j') {
        super('Re', type, location, '', REACTION_COLOUR.text)
    }

    get colour() {
        return REACTION_COLOUR
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    get settings() {
        return {
            type: this.species,
            location: this.location
        }
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    //===========
    copy(): Reaction {
        return new Reaction(this.species, this.location)
    }

    update(settings: StringProperties): boolean {
        //==========================================
        return super.update({
            species: settings.type,
            location: settings.location
        })
    }
}

//==============================================================================
//==============================================================================
/*
class Gyrator extends Converter
{
    copy(): Gyrator
    //=============
    {
        return new Gyrator(this.factor)
    }
}

//==============================================================================

class Transformer extends Converter
{
    copy(): Transformer
    //=================
    {
        return new Transformer(this.factor)
    }
}
*/
//==============================================================================
//==============================================================================

interface BondgraphProperties extends TemplateProperties {
    modelElement?: string
    modelParameters?: ModelValue[]
    modelStates?: ModelValue[]
}

//==============================================================================

class BondgraphComponent extends ComponentTemplate {
    #ElementClass: Constructor<BondgraphElement>
    #elementNode: BondgraphElement
    readonly #nameToPredicate: Map<string, NamedNode> = new Map()
    readonly #predicateToName: Map<string, string> = new Map()
    #modelElementsFromDomain: Map<string, string> = new Map()
    #modelParameters: ModelValue[] = []
    #modelStates: ModelValue[] = []

    private constructor(
        readonly CellDLClass: Constructor<CellDLObject>,
        uri: string,
        ElementClass: Constructor<BondgraphElement>,
        elementNode: BondgraphElement | null = null
    ) {
        if (elementNode === null) {
            elementNode = new ElementClass()
        }
        super(CellDLClass, uri)
        this.#ElementClass = ElementClass
        this.#elementNode = elementNode

        if ('propertyNames' in ElementClass) {
            for (const propertyName of ElementClass.propertyNames as string[]) {
                this.#nameToPredicate.set(propertyName, BG_NAMESPACE(propertyName))
                this.#predicateToName.set(BG_NAMESPACE(propertyName).uri, propertyName)
            }
            // Convert historical files
            this.#predicateToName.set(BG_NAMESPACE('variable').uri, 'species')
        }
    }

    static newBondgraphComponent(CellDLClass: Constructor<CellDLObject>, uri: string): BondgraphComponent {
        //===================================================================================================
        if (BondgraphElements.has(uri)) {
            const ElementClass = BondgraphElements.get(uri)
            return new BondgraphComponent(CellDLClass, uri, ElementClass!)
        } else {
            throw new Error(`Unknown bondgraph component, URI: ${uri}`)
        }
    }

    get templateProperties(): BondgraphProperties {
        //============================================
        const result = super.templateProperties as BondgraphProperties
        result.nodeSettings = this.#elementNode.settings
        result.modelElement = this.#modelElementName
        if (this.#modelParameters.length) {
            result.modelParameters = this.#modelParameters
        }
        if (this.#modelStates.length) {
            result.modelStates = this.#modelStates
        }
        return result
    }

    get elementNode() {
        //===============
        return this.#elementNode
    }

    get metadataProperties(): MetadataPropertiesMap {
        //=============================================
        const properties = super.metadataProperties
        const elementName = this.#modelElementName
        if (elementName) {
            properties.setProperty(BG_NAMESPACE('element'), BG_NAMESPACE(elementName))
        }
        const settings = new MetadataPropertiesMap()
        for (const [propertyName, value] of Object.entries(this.#elementNode.settings)) {
            if (value && this.#nameToPredicate.has(propertyName)) {
                settings.setProperty(
                    this.#nameToPredicate.get(propertyName)!,
                    $rdf.literal(value, BG_NAMESPACE('latex'))
                )
            }
        }
        properties.setProperty(BG_NAMESPACE('nodeSettings'), settings)
        properties.setProperty(
            BG_NAMESPACE('modelParameter'),
            new Set(this.#modelParameters.map((value) => value.metadataProperties()))
        )
        properties.setProperty(
            BG_NAMESPACE('modelState'),
            new Set(this.#modelStates.map((value) => value.metadataProperties()))
        )
        return properties
    }

    get #modelElementName(): string {
        //==============================
        return ''
    }

    get rdfPredicates(): NamedNode[] {
        //==============================
        return [
            ...super.rdfPredicates,
            BG_NAMESPACE('element'),
            BG_NAMESPACE('nodeSettings'),
            BG_NAMESPACE('modelParameter'),
            BG_NAMESPACE('modelState')
        ]
    }

    define(definition: MetadataPropertiesMap) {
        //====================================
        super.define(definition)
        const domainsList = definition.getPropertyAsArray(CELLDL_NAMESPACE('hasDomains'))
        for (const domainDef of domainsList) {
            if (domainDef instanceof MetadataPropertiesMap) {
                const domain = domainDef.getProperty(CELLDL_NAMESPACE('domain'))
                const element = domainDef.getProperty(BG_NAMESPACE('element'))
                if (domain && $rdf.isNamedNode(domain) && element && $rdf.isLiteral(element)) {
                    // @ts-expect-error: domain is a NamedNode and element is a Literal
                    this.#modelElementsFromDomain.set(domain.uri, element.value)
                }
            }
        }
        this.#updateModelValues()
        this.#updateSvg()
    }

    #updateModelValues() {
        //==================
        // Set state and parameters for the domain from element definition
        const elementName = this.#modelElementName
        if (elementName !== '') {
            /*
            const elementDefinition = libBondgraph.elementDefinition(this.#modelDomain, elementName)
            if (elementDefinition) {
                this.#modelParameters = modelValuesFromDefinition('parameters', elementDefinition)
                this.#modelStates = modelValuesFromDefinition('states', elementDefinition)
            }
            */
        }
    }

    #updateSvg() {
        //==========
        this.setSvg(
            LatexMath.svg(
                this.#elementNode.getLatex(),
                this.#elementNode.hasUnits ? unitsToLatex(this.#elementNode.units) : '',
                {
                    'min-width': ICON_MIN_WIDTH,
                    'min-height': ICON_MIN_HEIGHT,
                    'vertical-align': ICON_VERTICAL_ALIGN,
                    'border-width': this.#elementNode.colour.border ? ICON_BORDER : MIN_BORDER,
                    padding: ICON_PADDING,
                    'corner-radius': ICON_RADIUS,
                    background: this.#elementNode.colour.background,
                    border: this.#elementNode.colour.border || MIN_BORDER_COLOUR,
                    'suffix-background': UNITS_COLOUR.background
                }
            )
        )
    }

    copy(): BondgraphComponent {
        //========================
        const copy = new BondgraphComponent(this.CellDLClass, this.uri, this.#ElementClass, this.#elementNode.copy())
        copy.assign(this)
        return copy
    }

    assign(other: BondgraphComponent) {
        //===============================
        super.assign(other)
        this.#modelElementsFromDomain = other.#modelElementsFromDomain
        this.#modelParameters = [...other.#modelParameters]
        this.#modelStates = [...other.#modelStates]
    }

    updateFromMetadata(properties: MetadataPropertiesMap): boolean {
        //=========================================================
        super.updateFromMetadata(properties)
        const settings: StringProperties = {}
        const nodeSettings = properties.getPropertyAsArray(BG_NAMESPACE('nodeSettings'))
        for (const setting of nodeSettings.filter((object) => object instanceof MetadataPropertiesMap)) {
            for (const [predicate, values] of (<MetadataPropertiesMap>setting).predicateValues()) {
                if (this.#predicateToName.has(predicate.uri)) {
                    if (Array.isArray(values) || values instanceof Set) {
                        for (const value of values) {
                            // @ts-expect-error: value is a Literal
                            if ($rdf.isLiteral(value) && value.datatype.equals(BG_NAMESPACE('latex'))) {
                                // @ts-expect-error: value is a Literal
                                settings[this.#predicateToName.get(predicate.uri)!] = value.value
                                break
                            }
                        }
                        // @ts-expect-error: values is a Literal
                    } else if ($rdf.isLiteral(values) && values.datatype.equals(BG_NAMESPACE('latex'))) {
                        // @ts-expect-error: values is a Literal
                        settings[this.#predicateToName.get(predicate.uri)!] = values.value
                    }
                }
            }
        }
        this.#modelParameters = properties
            .getPropertyAsArray(BG_NAMESPACE('modelParameter'))
            .filter((object) => object instanceof MetadataPropertiesMap)
            .map((object) => ModelValue.fromMetadata(<MetadataPropertiesMap>object))
        this.#modelStates = properties
            .getPropertyAsArray(BG_NAMESPACE('modelState'))
            .filter((object) => object instanceof MetadataPropertiesMap)
            .map((object) => ModelValue.fromMetadata(<MetadataPropertiesMap>object))
        return this.updateTemplateProperties({ nodeSettings: settings })
    }

    updateTemplateProperties(properties: BondgraphProperties, _validated = false): boolean {
        //===================================================================================
        if (super.updateTemplateProperties(properties)) {
            // Domain change has reset parameters and states
            this.#updateModelValues()
        } else {
            if ('modelParameters' in properties) {
                this.#modelParameters = properties.modelParameters!
            }
            if ('modelStates' in properties) {
                this.#modelStates = properties.modelStates!
            }
        }
        if ('nodeSettings' in properties) {
            if (this.#elementNode.update(properties.nodeSettings!)) {
                this.#updateSvg()
                return true
            }
        }
        return false
    }

    validateTemplateProperties(_properties: BondgraphProperties): string {
        //===================================================================
        return '' // this.#elementNode.validateSettings(properties)
    }
}

//==============================================================================
//==============================================================================

import { LIBRARY_DESCRIPTION } from './description'

const ARROW_MARKERS = {
    'connection-end-arrow': ['bondgraph', 'biochemical', 'electrical', 'mechanical']
}

// @ts-expect-error: to be resolved....
const BondgraphElements = new Map([
    [BG_NAMESPACE('ZeroStorageNode').uri, ZeroStorageNode],
    [BG_NAMESPACE('OneResistanceNode').uri, OneResistanceNode],
    [BG_NAMESPACE('ZeroNode').uri, ZeroNode],
    [BG_NAMESPACE('OneNode').uri, OneNode],
    [BG_NAMESPACE('Capacitance').uri, Capacitance],
    [BG_NAMESPACE('Resistance').uri, Resistance],
    [BG_NAMESPACE('Reaction').uri, Reaction],
    [BG_NAMESPACE('Inductance').uri, Inductance],
    [BG_NAMESPACE('Converter').uri, Converter]
])

export const bondgraphLibrary: LibraryDefinition = {
    id: 'bondgraph',
    title: 'Bondgraph Nodes',
    rdfDefinition: LIBRARY_DESCRIPTION,
    templates: Array.from(BondgraphElements.keys()),
    componentFactory: BondgraphComponent.newBondgraphComponent,
    defaultComponent: BG_NAMESPACE('ZeroStorageNode').uri,
    svgDefinitions: [...Object.entries(ARROW_MARKERS)]
        .map(([id, markerTypes]) => markerTypes.map((type) => arrowMarkerDefinition(`${id}-${type}`, type)))
        .reduce((allDefinitions, definitions) => {
            allDefinitions.push(...definitions)
            return allDefinitions
        }, []),
    styleRules: [
        /* Bondgraph specific */
        'svg{--biochemical:#2F6EBA;--electrical:#DE8344;--mechanical:#4EAD5B}',
        '.biochemical{color:var(--biochemical)}',
        '.electrical{color:var(--electrical)}',
        '.mechanical{color:var(--mechanical)}',
        /* use var(--colour), setting them in master stylesheet included in <defs> (along with MathJax styles) */
        '.celldl-Connection.bondgraph.arrow{marker-end:url(#connection-end-arrow-bondgraph)}',
        '.celldl-Connection.bondgraph.biochemical.arrow{marker-end:url(#connection-end-arrow-biochemical)}',
        '.celldl-Connection.bondgraph.electrical.arrow{marker-end:url(#connection-end-arrow-electrical)}',
        '.celldl-Connection.bondgraph.mechanical.arrow{marker-end:url(#connection-end-arrow-mechanical)}'
    ].join('')
}

//==============================================================================
