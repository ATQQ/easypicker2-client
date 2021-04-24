import ajax from '../../ajax'

const baseUrl = '/super/overview'
function getCount() {
  return ajax.get<any, BaseResponse>(`${baseUrl}/count`)
}

function getAllLogMsg() {
  return ajax.get<any, BaseResponse>(`${baseUrl}/log`)
}
export default {
  getCount,
  getAllLogMsg,
}
