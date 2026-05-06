import ajax from '../ajax'

function getList(): CateGoryApiTypes.getList {
  return ajax.get('category')
}

function createNew(name: string): CateGoryApiTypes.createNew {
  return ajax.post('category/create', {
    name,
  })
}

function deleteOne(key: string): CateGoryApiTypes.deleteOne {
  return ajax.delete(`category/${key}`)
}

function updateSubmitNav(
  key: string,
  keys: string[],
): CateGoryApiTypes.updateSubmitNav {
  return ajax.put(`category/${key}/submit-nav`, { keys })
}

export default {
  getList,
  createNew,
  deleteOne,
  updateSubmitNav,
}
