import ajax from '../../ajax'

const baseUrl = '/super/overview'
function getCount(): OverviewApiTypes.getCount {
  return ajax.get(`${baseUrl}/count`)
}

function getAllLogMsg(): OverviewApiTypes.getAllLogMsg {
  return ajax.get(`${baseUrl}/log`)
}

function getLogMsg(
  pageSize: number,
  pageIndex: number,
  type: string,
  search: string
): OverviewApiTypes.getLogMsg {
  return ajax.post(`${baseUrl}/log`, {
    pageSize,
    pageIndex,
    type,
    search
  })
}

function getLogMsgDetail(id: string): any {
  return ajax.get(`${baseUrl}/log/${id}`)
}

function clearExpiredCompressFile() {
  return ajax.delete(`${baseUrl}/compress`)
}
export default {
  getCount,
  getAllLogMsg,
  getLogMsg,
  getLogMsgDetail,
  clearExpiredCompressFile
}
