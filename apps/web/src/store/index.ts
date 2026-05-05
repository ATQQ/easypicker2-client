import { createStore } from 'vuex'
import category from './modules/category'
import task from './modules/task'
import user from './modules/user'

// Create a new store instance.
const store = createStore({
  modules: {
    user,
    category,
    task,
  },
})

export default store
