import ajax from '../ajax'

function register(account:string, pwd:string, bindPhone = false, options?:any) {
  return ajax.post<any, BaseResponse>('user/register', {
    account,
    pwd,
    bindPhone,
    ...options,
  })
}

function login(account:string, pwd:string) {
  return ajax.post<any, BaseResponse>('user/login', {
    account, pwd,
  })
}

function codeLogin(phone:string, code:string) {
  return ajax.post<any, BaseResponse>('user/login/code', {
    phone, code,
  })
}
export default {
  register,
  login,
  codeLogin,
}
