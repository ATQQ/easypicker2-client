import { createStore } from 'vuex'
import user from './modules/user'
import category from './modules/category'

// Create a new store instance.
const store = createStore({
  modules: {
    user,
    category,
  },
})

export default store
