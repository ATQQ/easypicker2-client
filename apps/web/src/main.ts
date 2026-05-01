import { createApp } from 'vue'
import JsonViewer from 'vue-json-viewer'
import Axios from './apis/ajax'
import App from './App.vue'

import router from './router'
import store from './store'

document.title = import.meta.env.VITE_APP_TITLE

const app = createApp(App)

app.provide('$http', Axios)

app.use(router)
app.use(store)
app.use(JsonViewer)

app.mount('#app')
