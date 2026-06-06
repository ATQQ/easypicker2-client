import ajax from '../../ajax'

const baseUrl = '/super/user'
function getUserList(): SuperUserApiTypes.getUserList {
  return ajax.get(`${baseUrl}/list`)
}

function updateUserStatus(id: number, status: number, openTime: string) {
  return ajax.put(`${baseUrl}/status`, {
    id,
    status,
    openTime,
  })
}
function resetPassword(id: number, password: string) {
  return ajax.put(`${baseUrl}/password`, {
    id,
    password,
  })
}

function resetPhone(id: number, phone: string, code: string) {
  return ajax.put(`${baseUrl}/phone`, {
    id,
    phone,
    code,
  })
}

function resetEmail(id: number, email: string) {
  return ajax.put(`${baseUrl}/email`, {
    id,
    email,
  })
}

function sendMail(id: number, subject: string, text: string, html = '') {
  return ajax.post(`${baseUrl}/mail`, {
    id,
    subject,
    text,
    html,
  })
}

function clearOssFile(id: number, type: string) {
  return ajax.delete(`${baseUrl}/clear/oss`, {
    params: { id, type },
  })
}

function getMessageList(): SuperUserApiTypes.getMessageList {
  return ajax.get(`${baseUrl}/message`)
}

function readMessage(id: string) {
  return ajax.put(`${baseUrl}/message`, {
    id,
  })
}

function sendMessage(text: string, type: number, target?: number) {
  return ajax.post(`${baseUrl}/message`, {
    text,
    type,
    target,
  })
}
function logout(account: string) {
  return ajax.delete(`${baseUrl}/logout`, {
    params: { account },
  })
}

function resetLimitSpace(id: number, size: number) {
  return ajax.put(`${baseUrl}/size`, {
    id,
    size,
  })
}

function updateWallet(id: number, value: number) {
  return ajax.put(`${baseUrl}/wallet`, {
    id,
    value,
  })
}

function settleBilling(): SuperUserApiTypes.settleBilling {
  return ajax.post(`${baseUrl}/billing/settle`)
}

export default {
  getUserList,
  updateUserStatus,
  resetPassword,
  resetPhone,
  resetEmail,
  sendMail,
  clearOssFile,
  getMessageList,
  readMessage,
  sendMessage,
  logout,
  resetLimitSpace,
  updateWallet,
  settleBilling,
}
