import ajax from '../ajax'

/**
 * 获取验证码
 * @param mobile 手机号
 */
function getCode(phone: string):PublicApiTypes.getCode {
  return ajax.get(
    'public/code',
    {
      params: {
        phone,
      },
    },
  )
}

function reportPv(path:string):PublicApiTypes.reportPv {
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
