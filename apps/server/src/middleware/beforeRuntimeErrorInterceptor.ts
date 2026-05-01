import { RuntimeErrorInterceptor } from 'flash-wolves'
import { addErrorLog } from '@/db/logDb'

const interceptor: RuntimeErrorInterceptor = async (req, res, err) => {
  addErrorLog(req, err.toString(), err.stack)
}
export default interceptor
