import { Module } from 'vuex'
import { TaskApi } from '@/apis'

interface State {
  taskList: any[]
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      taskList: []
    }
  },
  mutations: {
    updateTask(state, payload) {
      state.taskList = payload
    }
  },
  actions: {
    getTask(context) {
      TaskApi.getList().then((res) => {
        context.commit('updateTask', res.data.tasks)
      })
    },
    createTask(context, payload) {
      const { name, category } = payload
      return TaskApi.create(name, category).then((res) => {
        context.dispatch('getTask')
        return res
      })
    },
    deleteTask(context, k) {
      return TaskApi.deleteOne(k).then((res) => {
        const idx = context.state.taskList.findIndex((v) => v.key === k)
        const targetTask = context.state.taskList[idx]
        if (targetTask && targetTask.category === 'trash') {
          context.state.taskList.splice(idx, 1)
        } else {
          targetTask.category = 'trash'
        }
        return res
      })
    },
    updateTask(context, payload) {
      const { key, name, category } = payload
      return TaskApi.updateBaseInfo(key, name, category).then((res) => {
        context.dispatch('getTask')
        return res
      })
    }
  }
}

export default store
