import { createApp } from 'vue'
import JsonViewer from 'vue-json-viewer'
import mountElementUI from './utils/elementUI'

import router from './router'
import store from './store'

import App from './App.vue'
import Axios from './apis/ajax'

document.title = import.meta.env.VITE_APP_TITLE

const app = createApp(App)

app.provide('$http', Axios)

app.use(router)
app.use(store)
app.use(JsonViewer)
// 引入需要的ElementUI Component
mountElementUI(app)

app.mount('#app')
