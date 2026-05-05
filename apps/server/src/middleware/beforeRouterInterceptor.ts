import { Middleware } from 'flash-wolves'
import { addRequestLog } from '@/db/logDb'

const interceptor: Middleware = async (req, res) => {
  addRequestLog(req, res)
}
export default interceptor
