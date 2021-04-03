import { createStore } from 'vuex'
import module1 from './modules/module1'

// Create a new store instance.
const store = createStore({
  modules: {
    m1: module1,
  },
})

export default store
