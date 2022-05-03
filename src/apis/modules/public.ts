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

function checkPhone(phone:string):PublicApiTypes.checkPhone {
  return ajax.get<any, BaseResponse>(
    'public/check/phone',
    {
      params: {
        phone,
      },
    },
  )
}
export default {
  getCode,
  reportPv,
  checkPhone,
}
