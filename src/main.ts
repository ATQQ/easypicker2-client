import { createApp } from 'vue'
import ElementPlus from 'element-plus'

import router from './router'
import store from './store'

import App from './App.vue'
import Axios from './apis/ajax'

import 'element-plus/lib/theme-chalk/index.css'

document.title = import.meta.env.VITE_APP_TITLE as string

const app = createApp(App)

app.provide('$http', Axios)

app.use(router)
app.use(store)
app.use(ElementPlus)

app.mount('#app')
