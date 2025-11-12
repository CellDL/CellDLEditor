//==============================================================================

import * as vue from 'vue'

export interface EditorToolButton {
    toolId: string
    active?: boolean
    prompt: string
    icon?: string
    image?: string
    panel?: vue.Raw<vue.Component>
}

//==============================================================================
