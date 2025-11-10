//==============================================================================

import * as vue from 'vue'

export interface IToolButton {
    id: string
    active?: boolean
    prompt: string
    icon: string
    panel?: vue.Raw<vue.Component>
}

//==============================================================================
