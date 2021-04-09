import { Module } from 'vuex'

interface State {
  token: string
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      token: localStorage.getItem('token') as string,
    }
  },
  // 只能同步
  mutations: {
    setToken(state, payload) {
      state.token = payload
      localStorage.setItem('token', payload)
    },
  },
}

export default store
