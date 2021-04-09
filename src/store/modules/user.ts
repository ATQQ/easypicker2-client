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
      if (payload) {
        localStorage.setItem('token', payload)
      } else {
        localStorage.removeItem('token')
      }
    },
  },
}

export default store
