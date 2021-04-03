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

export default {
  getCode,
}
