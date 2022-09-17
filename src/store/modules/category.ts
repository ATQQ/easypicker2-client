import { Module } from 'vuex'
import { CategoryApi } from '@/apis'

interface State {
  categoryList: any[]
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      categoryList: []
    }
  },
  mutations: {
    updateCategory(state, payload) {
      state.categoryList = payload
    }
  },
  actions: {
    getCategory(context) {
      CategoryApi.getList().then((res) => {
        context.commit('updateCategory', res.data.categories)
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
        const idx = context.state.categoryList.findIndex((v) => v.k === k)
        if (idx >= 0) {
          context.state.categoryList.splice(idx, 1)
        }
        return res
      })
    }
  }
}

export default store
