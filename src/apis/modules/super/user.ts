import ajax from '../../ajax'

const baseUrl = '/super/user'
function getUserList():SuperUserApiTypes.getUserList {
  return ajax.get(`${baseUrl}/list`)
}

function updateUserStatus(id:number, status:number, openTime:string) {
  return ajax.put(`${baseUrl}/status`, {
    id, status, openTime,
  })
}
export default {
  getUserList,
  updateUserStatus,
}
