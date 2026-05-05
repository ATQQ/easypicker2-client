import { Response } from 'flash-wolves'

export function wrapperCatchError(err: any) {
  const { code, msg, data } = err || {}
  if (code && msg && data) {
    return Response.fail(code, msg, data)
  }

  if (code && msg) {
    return Response.failWithError(err)
  }
  throw err
}
