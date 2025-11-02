/*

bgf:VoltageSource
    a bgf:ElementTemplate ;
    rdfs:subClassOf bgf:PotentialSource ;
    bgf:hasDomain bgf:Electrical .

#===============================================================================

bgf:CurrentSource
    a bgf:ElementTemplate ;
    rdfs:subClassOf bgf:FlowSource ;
    bgf:hasDomain bgf:Electrical .

#===============================================================================

bgf:ElectricalResistor
    a bgf:ElementTemplate ;
    rdfs:subClassOf bgf:Dissipator ;
    bgf:hasDomain bgf:Electrical ;
    rdfs:label "Electrical resistor" .


bgf:ElectricalCapacitor
    a bgf:ElementTemplate ;
    rdfs:subClassOf bgf:QuantityStore ;
    bgf:hasDomain bgf:Electrical ;
    rdfs:label "Electrical capacitor" ,

bgf:ElectricalInductor
    a bgf:ElementTemplate ;
    rdfs:subClassOf bgf:FlowStore ;
    bgf:hasDomain bgf:Electrical ;
    rdfs:label "Electrical inductor" ;


General SVG icon:
    * rounded rectangles
    * width, height, corner radius (as %),
    * fill, stroke, stroke-width
    * text (centred)
        * base variable
        * species/location

Properties:
    * base variable
    * species
    * location


ComponentTemplate:
    * id
    * size
    * fill, stroke, stroke-width
    * base variable


BG-RDF Template:
    * id
    * ComponentTemplate
    * Domain
    * Parameters/states


Object instance:
    * id
    * species
    * location
    * fill, stroke, stroke-width
    * ComponentTemplate
    * BG-RDF class



        <path d="M951.5 437.761C951.5 432.091 956.097 427.494 961.767 427.494L1028.23 427.494C1033.9 427.494 1038.5 432.091 1038.5 437.761L1038.5 444.227C1038.5 449.897 1033.9 454.494 1028.23 454.494L961.767 454.494C956.097 454.494 951.5 449.897 951.5 444.227Z" stroke="#FF0000" stroke-width="1.3335" stroke-linejoin="round" stroke-miterlimit="10" fill="white" fill-rule="evenodd" id="ID-0000010"/>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="13" transform="matrix(1 0 0 0.999986 954.838 446)">𝑞</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="9" transform="matrix(1 0 0 0.999986 961.745 450)">𝑣𝑐</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="9" transform="matrix(1 0 0 0.999986 962.412 439)">𝐻</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="8" transform="matrix(1 0 0 0.999986 969.226 441)">2</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="9" transform="matrix(1 0 0 0.999986 974.467 439)">𝑂</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="13" transform="matrix(1 0 0 0.999986 982.094 446)">,</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="13" transform="matrix(1 0 0 0.999986 986.982 446)">𝑢</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="9" transform="matrix(1 0 0 0.999986 994.649 449)">𝑣𝑐</text>
        <text font-family="Cambria Math,Cambria Math_MSFontService,sans-serif" font-weight="400" font-size="9" transform="matrix(1 0 0 0.999986 994.989 441)">𝑜𝑠𝑚𝑜𝑡𝑖𝑐</text>



<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="27.81328582763672px" height="32.90963363647461px" role="img" focusable="false" viewBox="-300.332 -1156.298 1546.964 1819.312" style="vertical-align: -1.5ex;" x="0.5684208869934082px" y="0.5678586959838867px">
    <rect x="-189.835" y="-1045.796" width="1325.969" height="1598.307" fill="#E2F0D9" stroke="red" stroke-width="110.497" rx="331.492" />
    <defs>
        <path id="ID-00000002-MJX-1-TEX-I-1D462" d="M21 287Q21 295 30 318T55 370T99 420T158 442Q204 442 227 417T250 358Q250 340 216 246T182 105Q182 62 196 45T238 27T291 44T328 78L339 95Q341 99 377 247Q407 367 413 387T427 416Q444 431 463 431Q480 431 488 421T496 402L420 84Q419 79 419 68Q419 43 426 35T447 26Q469 29 482 57T512 145Q514 153 532 153Q551 153 551 144Q550 139 549 130T540 98T523 55T498 17T462 -8Q454 -10 438 -10Q372 -10 347 46Q345 45 336 36T318 21T296 6T267 -6T233 -11Q189 -11 155 7Q103 38 103 113Q103 170 138 262T173 379Q173 380 173 381Q173 390 173 393T169 400T158 404H154Q131 404 112 385T82 344T65 302T57 280Q55 278 41 278H27Q21 284 21 287Z" />
        <path id="ID-00000002-MJX-1-TEX-I-1D456" d="M184 600Q184 624 203 642T247 661Q265 661 277 649T290 619Q290 596 270 577T226 557Q211 557 198 567T184 600ZM21 287Q21 295 30 318T54 369T98 420T158 442Q197 442 223 419T250 357Q250 340 236 301T196 196T154 83Q149 61 149 51Q149 26 166 26Q175 26 185 29T208 43T235 78T260 137Q263 149 265 151T282 153Q302 153 302 143Q302 135 293 112T268 61T223 11T161 -11Q129 -11 102 10T74 74Q74 91 79 106T122 220Q160 321 166 341T173 380Q173 404 156 404H154Q124 404 99 371T61 287Q60 286 59 284T58 281T56 279T53 278T49 278T41 278H27Q21 284 21 287Z" />
        <path id="ID-00000002-MJX-1-TEX-I-1D457" d="M297 596Q297 627 318 644T361 661Q378 661 389 651T403 623Q403 595 384 576T340 557Q322 557 310 567T297 596ZM288 376Q288 405 262 405Q240 405 220 393T185 362T161 325T144 293L137 279Q135 278 121 278H107Q101 284 101 286T105 299Q126 348 164 391T252 441Q253 441 260 441T272 442Q296 441 316 432Q341 418 354 401T367 348V332L318 133Q267 -67 264 -75Q246 -125 194 -164T75 -204Q25 -204 7 -183T-12 -137Q-12 -110 7 -91T53 -71Q70 -71 82 -81T95 -112Q95 -148 63 -167Q69 -168 77 -168Q111 -168 139 -140T182 -74L193 -32Q204 11 219 72T251 197T278 308T289 365Q289 372 288 376Z" />
    </defs>
    <g stroke="currentColor" fill="currentColor" stroke-width="0" transform="scale(1,-1)">
        <g data-mml-node="math">
            <g data-mml-node="mstyle" fill="#00B050" stroke="#00B050">
                <g data-mml-node="msubsup">
                    <g data-mml-node="mi">
                        <use data-c="1D462" xlink:href="#ID-00000002-MJX-1-TEX-I-1D462" />
                    </g>
                    <g data-mml-node="TeXAtom" transform="translate(605,363) scale(0.707)" data-mjx-texclass="ORD">
                        <g data-mml-node="mi">
                            <use data-c="1D456" xlink:href="#ID-00000002-MJX-1-TEX-I-1D456" />
                        </g>
                    </g>
                    <g data-mml-node="TeXAtom" transform="translate(605,-292.2) scale(0.707)" data-mjx-texclass="ORD">
                        <g data-mml-node="mi">
                            <use data-c="1D457" xlink:href="#ID-00000002-MJX-1-TEX-I-1D457" />
                        </g>
                    </g>
                </g>
            </g>
        </g>
    </g>
</svg>
*/
