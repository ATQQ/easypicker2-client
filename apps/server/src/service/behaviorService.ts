import { Context, InjectCtx, Provide } from 'flash-wolves'
import { LogBehaviorData } from '@/db/model/log'
import { addBehavior, addErrorLog, addPvLog } from '@/db/logDb'

@Provide()
export default class BehaviorService {
  @InjectCtx()
  private Ctx: Context

  add(module: LogBehaviorData.BehaviorInfoModule, msg: string, data?: any) {
    return addBehavior(this.Ctx.req, {
      module,
      msg,
      data
    })
  }

  addPV(path: string) {
    return addPvLog(this.Ctx.req, path)
  }

  error(msg: string, stack?: any) {
    return addErrorLog(this.Ctx.req, msg, stack ?? {})
  }
}
