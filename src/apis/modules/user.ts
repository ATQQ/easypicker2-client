import ajax from '../ajax'

function register(
  options: UserApiTypes.RegisterOptions
): UserApiTypes.register {
  return ajax.post('user/register', {
    ...options
  })
}

function login(account: string, pwd: string): UserApiTypes.login {
  return ajax.post('user/login', {
    account,
    pwd
  })
}

function codeLogin(phone: string, code: string): UserApiTypes.codeLogin {
  return ajax.post('user/login/code', {
    phone,
    code
  })
}

function resetPwd(
  phone: string,
  code: string,
  pwd: string
): UserApiTypes.resetPwd {
  return ajax.put('user/password', {
    phone,
    code,
    pwd
  })
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
  resetPwd,
  checkPower,
  checkLoginStatus,
  logout,
  usage
}
