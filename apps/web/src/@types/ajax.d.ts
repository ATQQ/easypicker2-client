interface BaseResponse<T = any> {
  code: number
  errMsg: string
  data: T
}
