import ajax from '../../ajax'

const baseUrl = '/super/overview'
function getCount():OverviewApiTypes.getCount {
  return ajax.get(`${baseUrl}/count`)
}

function getAllLogMsg():OverviewApiTypes.getAllLogMsg {
  return ajax.get(`${baseUrl}/log`)
}
export default {
  getCount,
  getAllLogMsg,
}
