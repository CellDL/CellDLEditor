import { createApp } from 'vue'
import ConfirmationService from 'primevue/confirmationservice';

import App from './App.vue'

const app = createApp(App)
app.use(ConfirmationService)

app.mount('#app')
