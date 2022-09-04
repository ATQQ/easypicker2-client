import { Module } from 'vuex'
import { UserApi } from '@/apis'

interface State {
  token: string
  isSuperAdmin: boolean
  isLogin: boolean
  system: boolean
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      token: localStorage.getItem('token') as string,
      isSuperAdmin: false,
      isLogin: false,
      system: localStorage.getItem('token') === 'true'
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
    setSystem(state, payload) {
      state.system = payload
      if (payload) {
        localStorage.setItem('system', payload)
      } else {
        localStorage.removeItem('system')
      }
    },
    setSuperAdmin(state, payload) {
      state.isSuperAdmin = payload
    },
    setLoginStatue(state, payload) {
      state.isLogin = payload?.isLogin
    }
  },
  actions: {
    getLoginStatus(context) {
      UserApi.checkLoginStatus().then((res) => {
        context.commit('setLoginStatue', {
          isLogin: res.data
        })
      })
    }
  }
}

export default store
