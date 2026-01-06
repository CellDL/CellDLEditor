import { createApp } from 'vue'
import ConfirmationService from 'primevue/confirmationservice';

import { componentLibraryPlugin } from '@renderer/plugins/index'

import App from './App.vue'

const app = createApp(App)
app.use(ConfirmationService)

componentLibraryPlugin.install(app, {})

app.mount('#app')
