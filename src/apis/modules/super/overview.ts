import { mergeRequest } from '@/utils/networkUtil'
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

function _checkDisabledRoute(route: string): OverviewApiTypes.disabledStatus {
  return ajax.get(`${baseUrl}/route/disabled`, {
    params: {
      route
    }
  })
}

const checkDisabledRoute = mergeRequest(_checkDisabledRoute)

function addDisabledRoute(route: string, status: boolean) {
  return ajax.post(`${baseUrl}/route/disabled`, {
    route,
    status
  })
}
export default {
  getCount,
  getAllLogMsg,
  getLogMsg,
  getLogMsgDetail,
  clearExpiredCompressFile,
  checkDisabledRoute,
  addDisabledRoute
}
