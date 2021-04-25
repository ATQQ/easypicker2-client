import ajax from '../../ajax'

const baseUrl = '/super/user'
function getUserList() {
  return ajax.get<any, BaseResponse>(`${baseUrl}/list`)
}

function updateUserStatus(id:number, status:number, openTime:string) {
  return ajax.put<any, BaseResponse>(`${baseUrl}/status`, {
    id, status, openTime,
  })
}
export default {
  getUserList,
  updateUserStatus,
}
