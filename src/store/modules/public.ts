import { Module } from 'vuex'

interface State {
  clientWidth: number
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      clientWidth: 701
    }
  },
  getters: {
    isMobile(state) {
      return state.clientWidth <= 700
    }
  },
  // 只能同步
  mutations: {
    setWidth(state, width = 701) {
      state.clientWidth = width
    }
  }
}

export default store
