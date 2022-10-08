import ajax from '../ajax'

function getDownloadActions(
  pageSize: number,
  pageIndex: number,
  extraIds: string[] = []
): ActionApiTypes.getDownloadActions {
  return ajax.post('/action/download/list', {
    pageSize,
    pageIndex,
    extraIds
  })
}

export default {
  getDownloadActions
}
