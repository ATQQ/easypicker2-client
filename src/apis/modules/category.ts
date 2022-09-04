import ajax from '../ajax'

function getList(): CateGoryApiTypes.getList {
  return ajax.get('category')
}

function createNew(name: string): CateGoryApiTypes.createNew {
  return ajax.post('category/create', {
    name
  })
}

function deleteOne(key: string): CateGoryApiTypes.deleteOne {
  return ajax.delete(`category/${key}`)
}
export default {
  getList,
  createNew,
  deleteOne
}
