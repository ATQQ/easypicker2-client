import { UserApi } from '@/apis'
import { Module } from 'vuex'

interface State {
  token: string,
  isSuperAdmin: boolean
  isLogin: boolean
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      token: localStorage.getItem('token') as string,
      isSuperAdmin: false,
      isLogin: false,
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
    setLoginStatue(state, payload) {
      state.isLogin = payload?.isLogin
    },
  },
  actions: {
    getLoginStatus(context) {
      UserApi.checkLoginStatus().then((res) => {
        context.commit('setLoginStatue', {
          isLogin: res.data,
        })
      })
    },
  },
}

export default store
