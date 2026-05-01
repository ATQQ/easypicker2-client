import { RequestValue } from 'flash-wolves'

export function ReqIp() {
  return RequestValue('_ip')
}

export function ReqUserInfo() {
  return RequestValue('_userinfo')
}
