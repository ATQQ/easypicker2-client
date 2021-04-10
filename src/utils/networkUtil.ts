type SuccessCallback = (data:any) => void
export function jsonp(url: string, jsonpCallback: string, success:SuccessCallback) {
  const $script = document.createElement('script')
  $script.src = `${url}&callback=${jsonpCallback}`
  $script.async = true
  $script.type = 'text/javascript';
  (<any>window)[jsonpCallback] = function callback(data:any) {
    if (success) {
      success(data)
    }
  }
  document.body.appendChild($script)
}
