import { createStore } from 'vuex'
import user from './modules/user'
import category from './modules/category'
import task from './modules/task'
import publicModule from './modules/public'

// Create a new store instance.
const store = createStore({
  modules: {
    user,
    category,
    task,
    public: publicModule,
  },
})

export default store
