import ajax from '../ajax'

function getList() {
  return ajax.get<any, BaseResponse>('task')
}

function create(name:string, category:string) {
  return ajax.post<any, BaseResponse>('task/create', {
    name,
    category,
  })
}

function deleteOne(key:string) {
  return ajax.delete<any, BaseResponse>(`/task/${key}`)
}

function updateBaseInfo(key:string, name:string, category:string) {
  return ajax.put<any, BaseResponse>(`/task/${key}`, {
    name,
    category,
  })
}

function getTaskInfo(key:string) {
  return ajax.get<any, BaseResponse>(`/task/${key}`)
}
export default {
  getList,
  create,
  deleteOne,
  updateBaseInfo,
  getTaskInfo,
}
