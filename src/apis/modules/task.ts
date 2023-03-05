import ajax from '../ajax'

function getList(): TaskApiTypes.getList {
  return ajax.get('task')
}

function create(name: string, category: string): TaskApiTypes.create {
  return ajax.post('task/create', {
    name,
    category
  })
}

function deleteOne(key: string): TaskApiTypes.deleteOne {
  return ajax.delete(`task/${key}`)
}

function updateBaseInfo(
  key: string,
  name: string,
  category: string
): TaskApiTypes.updateBaseInfo {
  return ajax.put(`task/${key}`, {
    name,
    category
  })
}

function getTaskInfo(key: string): TaskApiTypes.getTaskInfo {
  return ajax.get(`task/${key}`)
}

function getTaskMoreInfo(key: string): TaskApiTypes.getTaskMoreInfo {
  return ajax.get(`task_info/${key}`)
}

function updateTaskMoreInfo(
  key: string,
  options: TaskApiTypes.TaskInfo
): TaskApiTypes.updateTaskMoreInfo {
  return ajax.put(`task_info/${key}`, options)
}

function getUsefulTemplate(key: string): TaskApiTypes.getUsefulTemplate {
  return ajax.get(`/task_info/template/${key}`)
}

function delTipImage(key: string, uid: number, name: string) {
  return ajax.delete(`/task_info/tip/image/${key}`, {
    params: {
      uid,
      name
    }
  })
}

export default {
  getList,
  create,
  deleteOne,
  updateBaseInfo,
  getTaskInfo,
  getTaskMoreInfo,
  updateTaskMoreInfo,
  getUsefulTemplate,
  delTipImage
}
