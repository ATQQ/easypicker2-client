import ajax from '../ajax'

function getList():TaskApiTypes.getList {
  return ajax.get('task')
}

function create(name:string, category:string):TaskApiTypes.create {
  return ajax.post('task/create', {
    name,
    category,
  })
}

function deleteOne(key:string):TaskApiTypes.deleteOne {
  return ajax.delete(`task/${key}`)
}

function updateBaseInfo(key:string, name:string, category:string):TaskApiTypes.updateBaseInfo {
  return ajax.put(`task/${key}`, {
    name,
    category,
  })
}

function getTaskInfo(key:string):TaskApiTypes.getTaskInfo {
  return ajax.get(`task/${key}`)
}

function getTaskMoreInfo(key:string):TaskApiTypes.getTaskMoreInfo {
  return ajax.get(`task_info/${key}`)
}

function updateTaskMoreInfo(key:string,
  options:TaskApiTypes.TaskInfo):TaskApiTypes.updateTaskMoreInfo {
  return ajax.put(`task_info/${key}`, options)
}
export default {
  getList,
  create,
  deleteOne,
  updateBaseInfo,
  getTaskInfo,
  getTaskMoreInfo,
  updateTaskMoreInfo,
}
