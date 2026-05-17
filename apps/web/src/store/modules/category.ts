import type { Module } from 'vuex'
import { CategoryApi } from '@/apis'

interface State {
  categoryList: any[]
  taskCounts: Record<string, number>
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      categoryList: [],
      taskCounts: {},
    }
  },
  mutations: {
    updateCategory(state, payload) {
      state.categoryList = payload
    },
    updateTaskCounts(state, payload) {
      state.taskCounts = payload || {}
    },
  },
  actions: {
    getCategory(context) {
      return CategoryApi.getList().then((res) => {
        context.commit('updateCategory', res.data.categories)
        context.commit('updateTaskCounts', res.data.taskCounts)
        return res
      })
    },
    createCategory(context, name) {
      return CategoryApi.createNew(name).then((res) => {
        context.dispatch('getCategory')
        return res
      })
    },
    deleteCategory(context, k) {
      return CategoryApi.deleteOne(k).then((res) => {
        const idx = context.state.categoryList.findIndex(v => v.k === k)
        if (idx >= 0) {
          context.state.categoryList.splice(idx, 1)
        }
        return res
      })
    },
  },
}

export default store
