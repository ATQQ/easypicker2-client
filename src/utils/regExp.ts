// 手机号
export const rMobilePhone = /^(13[0-9]|14[5|7]|15[0|1|2|3|5|6|7|8|9]|16[0-9]|17[0-9]|18[0|1|2|3|5|6|7|8|9])\d{8}$/

// 账号
export const rAccount = /^(\d|[a-zA-Z]){4,8}$/

// 密码 支持字母/数字/下划线(6-16)
export const rPassword = /^\w{6,16}$/

// 验证码
export const rVerCode = /^\d{4}$/
