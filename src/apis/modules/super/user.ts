import ajax from '../../ajax'

const baseUrl = '/super/user'
function getUserList(): SuperUserApiTypes.getUserList {
  return ajax.get(`${baseUrl}/list`)
}

function updateUserStatus(id: number, status: number, openTime: string) {
  return ajax.put(`${baseUrl}/status`, {
    id,
    status,
    openTime
  })
}
function resetPassword(id: number, password: string) {
  return ajax.put(`${baseUrl}/password`, {
    id,
    password
  })
}

function resetPhone(id: number, phone: string, code: string) {
  return ajax.put(`${baseUrl}/phone`, {
    id,
    phone,
    code
  })
}

function clearOssFile(id: number, type: string) {
  return ajax.delete(`${baseUrl}/clear/oss`, {
    params: { id, type }
  })
}

export default {
  getUserList,
  updateUserStatus,
  resetPassword,
  resetPhone,
  clearOssFile
}
