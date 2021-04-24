import ajax from '../ajax'

/**
 * 获取验证码
 * @param mobile 手机号
 */
function getCode(phone: string) {
  return ajax.get<any, BaseResponse>(
    'public/code',
    {
      params: {
        phone,
      },
    },
  )
}

function reportPv(path:string) {
  return ajax.post<any, BaseResponse>(
    'public/report/pv',
    {
      path,
    },
  )
}
export default {
  getCode,
  reportPv,
}
