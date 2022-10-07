import ajax from '../ajax'

function getDownloadActions(
  pageSize: number,
  pageIndex: number
): ActionApiTypes.getDownloadActions {
  return ajax.get('/action/download/list', {
    params: {
      pageSize,
      pageIndex
    }
  })
}

export default {
  getDownloadActions
}
