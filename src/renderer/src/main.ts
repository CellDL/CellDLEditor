import { createApp } from 'vue'
import VueSafeTeleport from 'vue-safe-teleport'

import App from './App.vue'

createApp(App).use(VueSafeTeleport)
              .mount('#app')
