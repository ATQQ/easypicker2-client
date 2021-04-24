import ajax from '../../ajax'

const baseUrl = '/super/user'
function getUserList() {
  return ajax.get<any, BaseResponse>(`${baseUrl}/list`)
}

export default {
  getUserList,
}
