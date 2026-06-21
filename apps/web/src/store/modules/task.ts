import type { Module } from 'vuex'
import { TaskApi } from '@/apis'

interface State {
  taskList: any[]
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      taskList: [],
    }
  },
  mutations: {
    updateTask(state, payload) {
      state.taskList = payload
    },
  },
  actions: {
    async getAllTaskOptions(context, payload: { recent?: boolean } = {}) {
      const rootState = context.rootState as {
        category?: { categoryList: { k: string }[] }
      }
      if (!rootState.category?.categoryList.length) {
        await context.dispatch('category/getCategory', null, { root: true })
      }
      const categoryKeys = [
        'default',
        'trash',
        ...(rootState.category?.categoryList ?? []).map(c => c.k),
      ]
      const results = await Promise.all(
        categoryKeys.map(category =>
          TaskApi.getByCategory(category, { recent: payload.recent }),
        ),
      )
      const taskMap = new Map<string, TaskApiTypes.TaskItem>()
      for (const res of results) {
        for (const task of res.data.tasks) {
          taskMap.set(task.key, task)
        }
      }
      const tasks = Array.from(taskMap.values())
      context.commit('updateTask', tasks)
      return { data: { tasks } }
    },
    getTask(context, payload: { recent?: boolean } = {}) {
      return context.dispatch('getAllTaskOptions', payload)
    },
    getTaskByCategory(context, payload: { category: string, recent?: boolean }) {
      return TaskApi.getByCategory(payload.category, {
        recent: payload.recent,
      }).then((res) => {
        context.commit('updateTask', res.data.tasks)
        return res
      })
    },
    createTask(context, payload) {
      const { name, category } = payload
      return TaskApi.create(name, category).then((res) => {
        context.dispatch('getTaskByCategory', { category })
        context.dispatch('category/getCategory', null, { root: true })
        return res
      })
    },
    deleteTask(context, k) {
      return TaskApi.deleteOne(k).then((res) => {
        const idx = context.state.taskList.findIndex(v => v.key === k)
        const targetTask = context.state.taskList[idx]
        if (targetTask && targetTask.category === 'trash') {
          context.state.taskList.splice(idx, 1)
        }
        else {
          targetTask.category = 'trash'
        }
        context.dispatch('category/getCategory', null, { root: true })
        return res
      })
    },
    updateTask(context, payload) {
      const { key, name, category, listCategory } = payload
      return TaskApi.updateBaseInfo(key, name, category).then((res) => {
        if (listCategory) {
          context.dispatch('getTaskByCategory', { category: listCategory })
        }
        else {
          context.dispatch('getTask')
        }
        context.dispatch('category/getCategory', null, { root: true })
        return res
      })
    },
  },
}

export default store
