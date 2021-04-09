import ajax from '../ajax'

function getList() {
  return ajax.get<any, BaseResponse>(
    'category',
  )
}

function createNew(name:string) {
  return ajax.post<any, BaseResponse>(
    'category/create', {
      name,
    },
  )
}

function deleteOne(key:string) {
  return ajax.delete<any, BaseResponse>(`category/${key}`)
}
export default {
  getList,
  createNew,
  deleteOne,
}
