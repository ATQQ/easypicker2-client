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
export default {
  register,
  login,
}
