import { Module } from 'vuex'

interface State {
  token: string,
  isSuperAdmin: boolean
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      token: localStorage.getItem('token') as string,
      isSuperAdmin: false,
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
    setSuperAdmin(state, payload) {
      state.isSuperAdmin = payload
    },
  },
}

export default store
