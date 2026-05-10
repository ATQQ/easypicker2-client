import ajax from '../ajax'

function register(
  options: UserApiTypes.RegisterOptions,
): UserApiTypes.register {
  return ajax.post('user/register', {
    ...options,
  })
}

function login(account: string, pwd: string): UserApiTypes.login {
  return ajax.post('user/login', {
    account,
    pwd,
  })
}

function codeLogin(phone: string, code: string): UserApiTypes.codeLogin {
  return ajax.post('user/login/code', {
    phone,
    code,
  })
}

function loginByEmailCode(
  email: string,
  code: string,
): UserApiTypes.loginByEmailCode {
  return ajax.post('user/login/email-code', { email, code })
}

function resetPwd(payload: {
  phone?: string
  email?: string
  code: string
  pwd: string
}): UserApiTypes.resetPwd {
  return ajax.put('user/password', payload)
}

function getProfile(): UserApiTypes.getProfile {
  return ajax.get('user/profile')
}

function setProfileNotify(notifyOnSubmit: boolean): UserApiTypes.setProfileNotify {
  return ajax.put('user/profile/notify', { notifyOnSubmit })
}

function bindProfileEmail(
  email: string,
  code: string,
): UserApiTypes.bindProfileEmail {
  return ajax.put('user/profile/email', { email, code })
}

function resetProfilePassword(
  code: string,
  pwd: string,
): UserApiTypes.resetProfilePassword {
  return ajax.put('user/profile/password', { code, pwd })
}

function checkPower(): UserApiTypes.checkPower {
  return ajax.get('user/power/super')
}

function checkLoginStatus(): UserApiTypes.checkLoginStatus {
  return ajax.get('user/login')
}

function logout(): UserApiTypes.logout {
  return ajax.get('user/logout')
}

function usage(): UserApiTypes.usage {
  return ajax.get('user/usage')
}

export default {
  register,
  login,
  codeLogin,
  loginByEmailCode,
  resetPwd,
  getProfile,
  setProfileNotify,
  bindProfileEmail,
  resetProfilePassword,
  checkPower,
  checkLoginStatus,
  logout,
  usage,
}
