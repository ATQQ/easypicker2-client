import { RuntimeErrorInterceptor } from 'flash-wolves'
import { addErrorLog } from '@/db/logDb'
import { sendServiceAlertMail } from '@/utils/mail'

const interceptor: RuntimeErrorInterceptor = async (req, res, err) => {
  addErrorLog(req, err.toString(), err.stack)
  void sendServiceAlertMail(
    `${req.method} ${req.url}`,
    `${err?.toString?.() || err}\n${err?.stack || ''}`.slice(0, 8000),
  )
}
export default interceptor
