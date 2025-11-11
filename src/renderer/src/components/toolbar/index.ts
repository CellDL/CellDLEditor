//==============================================================================

import * as vue from 'vue'

export interface IToolButton {
    toolId: string
    active?: boolean
    prompt: string
    icon: string
    panel?: vue.Raw<vue.Component>
}

//==============================================================================
