import type { Module } from 'vuex'
import { TaskApi } from '@/apis'

/** 文件页筛选用的虚拟分类，不是真实任务分类 */
const VIRTUAL_FILE_CATEGORIES = new Set(['all', 'no-task'])

interface State {
  taskList: any[]
  tasksByCategory: Record<string, TaskApiTypes.TaskItem[]>
}

const store: Module<State, unknown> = {
  namespaced: true,
  state() {
    return {
      taskList: [],
      tasksByCategory: {},
    }
  },
  mutations: {
    updateTask(state, payload) {
      state.taskList = payload
    },
    updateTasksByCategory(state, payload: Record<string, TaskApiTypes.TaskItem[]>) {
      state.tasksByCategory = payload
    },
    clearTasksByCategoryCache(state) {
      state.tasksByCategory = {}
    },
  },
  actions: {
    async getAllTaskOptions(context, payload: { recent?: boolean } = {}) {
      const res = await TaskApi.getGrouped(payload)
      context.commit('updateTask', res.data.tasks)
      context.commit('updateTasksByCategory', res.data.tasksByCategory)
      context.commit('category/updateCategory', res.data.categories, { root: true })
      context.commit('category/updateTaskCounts', res.data.taskCounts, { root: true })
      return res
    },
    getTask(context, payload: { recent?: boolean } = {}) {
      return context.dispatch('getAllTaskOptions', payload)
    },
    getTaskByCategory(context, payload: { category: string, recent?: boolean }) {
      if (VIRTUAL_FILE_CATEGORIES.has(payload.category)) {
        if (payload.category === 'no-task') {
          context.commit('updateTask', [])
          return Promise.resolve({ data: { tasks: [] } })
        }
        return context.dispatch('getAllTaskOptions', payload)
      }

      const cached = context.state.tasksByCategory[payload.category]
      if (cached) {
        context.commit('updateTask', cached)
        return Promise.resolve({ data: { tasks: cached } })
      }

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
        context.commit('clearTasksByCategoryCache')
        context.dispatch('getTaskByCategory', { category })
        context.dispatch('category/getCategory', null, { root: true })
        return res
      })
    },
    deleteTask(context, k) {
      return TaskApi.deleteOne(k).then((res) => {
        context.commit('clearTasksByCategoryCache')
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
        context.commit('clearTasksByCategoryCache')
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
