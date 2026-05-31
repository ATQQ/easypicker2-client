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
  search: string,
  ipSearch = '',
): OverviewApiTypes.getLogMsg {
  return ajax.post(`${baseUrl}/log`, {
    pageSize,
    pageIndex,
    type,
    search,
    ipSearch,
  })
}

function getLogMsgDetail(id: string): any {
  return ajax.get(`${baseUrl}/log/${id}`)
}

function getRequestMetrics(options: {
  startTime?: number
  endTime?: number
  method?: string
  path?: string
}): OverviewApiTypes.getRequestMetrics {
  return ajax.post(`${baseUrl}/request-metrics`, options)
}

function getMonitorMetrics(options: {
  startTime?: number
  endTime?: number
}): OverviewApiTypes.getMonitorMetrics {
  return ajax.post(`${baseUrl}/monitor-metrics`, options)
}

function getRequestStatusMetrics(options: {
  startTime?: number
  endTime?: number
  method?: string
  path?: string
}): OverviewApiTypes.getRequestStatusMetrics {
  return ajax.post(`${baseUrl}/request-status-metrics`, options)
}

function getRequestStatusLogs(options: {
  startTime?: number
  endTime?: number
  method?: string
  path?: string
  statusCode?: number
  non200Only?: boolean
  pageSize?: number
  pageIndex?: number
}): OverviewApiTypes.getRequestStatusLogs {
  return ajax.post(`${baseUrl}/request-status-logs`, options)
}

function clearExpiredCompressFile() {
  return ajax.delete(`${baseUrl}/compress`)
}

function _checkDisabledRoute(route: string): OverviewApiTypes.disabledStatus {
  return ajax.get(`${baseUrl}/route/disabled`, {
    params: {
      route,
    },
  })
}

const checkDisabledRoute = mergeRequest(_checkDisabledRoute)

function addDisabledRoute(route: string, status: boolean) {
  return ajax.post(`${baseUrl}/route/disabled`, {
    route,
    status,
  })
}

function getGlobalConfig(type = 'site'): OverviewApiTypes.getGlobalConfig {
  return ajax.get(`/config/global`, { params: { type } })
}

function getGlobalAllConfig(type = 'site'): OverviewApiTypes.getGlobalConfig {
  return ajax.get(`/config/global/all`, { params: { type } })
}

function updateGlobalConfig(key: string, value: any) {
  return ajax.put(`/config/global`, { key, value })
}

export default {
  getCount,
  getAllLogMsg,
  getLogMsg,
  getLogMsgDetail,
  getRequestMetrics,
  getMonitorMetrics,
  getRequestStatusMetrics,
  getRequestStatusLogs,
  clearExpiredCompressFile,
  checkDisabledRoute,
  addDisabledRoute,
  getGlobalConfig,
  updateGlobalConfig,
  getGlobalAllConfig,
}
