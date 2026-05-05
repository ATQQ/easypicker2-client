import {
  RouterController,
  Post,
  ReqBody,
  FWRequest,
  Get,
  Put,
  ReqParams,
  Response
} from 'flash-wolves'
import { WishStatus } from '@/db/model/wish'
import type { Wish } from '@/db/model/wish'
import { addWishData, findWish, updateWish } from '@/db/wishDb'
import { getObjectIdDate, getUniqueKey } from '@/utils/stringUtil'
import { addBehavior } from '@/db/logDb'
import { USER_POWER } from '@/db/model/user'
import { ReqIp } from '@/decorator'
import { addAction, findAction, findActionCount } from '@/db/actionDb'
import { ActionType } from '@/db/model/action'

const adminPower = { needLogin: true, userPower: USER_POWER.SUPER }
// TODO：mongoDB支持 typeorm
@RouterController('wish')
export default class WishController {
  /**
   * 提交需求
   */
  @Post('add', { CORS: true })
  async addWish(@ReqBody() body: Wish, req: FWRequest) {
    addBehavior(req, {
      module: 'wish',
      msg: '需求反馈',
      data: body
    })

    const wish: Wish = {
      ...body,
      id: getUniqueKey(),
      status: WishStatus.REVIEW
    }
    await addWishData(wish)
  }

  @Get('all', adminPower)
  async getAllWish() {
    const wishes = await findWish({})
    // 按照日期从大到小排序
    wishes.sort((a, b) => {
      const aDate = getObjectIdDate(a.id)
      const bDate = getObjectIdDate(b.id)
      return bDate - aDate
    })
    return wishes.map((wish) => {
      const { title, des, status, id, contact } = wish
      const createDate = getObjectIdDate(id)
      return {
        title,
        des,
        status,
        id,
        contact,
        createDate
      }
    })
  }

  @Put('update', adminPower)
  async updateWishStatus(
    @ReqBody('id') id: string,
    @ReqBody('status') status: WishStatus
  ) {
    await updateWish({ id }, { $set: { status } })
    // 不同状态，更新时间字段
    if (status === WishStatus.START) {
      await updateWish({ id }, { $set: { startDate: new Date() } })
    }
    if (status === WishStatus.CLOSE || status === WishStatus.END) {
      await updateWish({ id }, { $set: { endDate: new Date() } })
    }
  }

  @Put('update/:id', adminPower)
  async updateWishData(@ReqParams('id') id: string, @ReqBody() body: Wish) {
    const { title, des } = body
    await updateWish({ id }, { $set: { title, des } })
  }

  @Get('all/docs', { CORS: true })
  async getDocsWish(@ReqIp() ip: string) {
    const wishes = await findWish({
      $or: [
        { status: WishStatus.START },
        { status: WishStatus.WAIT },
        { status: WishStatus.END }
      ]
    })
    const result = []
    for (const wish of wishes) {
      const { title, des, id, startDate, status } = wish
      const count = await findActionCount({
        thingId: wish.id,
        type: ActionType.PRAISE
      })
      const alreadyPraise =
        (await findActionCount({
          thingId: wish.id,
          type: ActionType.PRAISE,
          ip
        })) > 0
      result.push({
        title: status === WishStatus.END ? `(已上线) ${title}` : title,
        des,
        id,
        startDate,
        count,
        alreadyPraise,
        status
      })
    }
    // 从大到小
    result.sort((a, b) => b.count - a.count)
    return result
  }

  /**
   * 点赞需求
   */
  @Post('praise/:id', { CORS: true })
  async praiseWis(@ReqParams('id') id: string, @ReqIp() ip: string) {
    const wishes = await findWish({ id })
    if (!wishes.length) {
      return Response.fail(-1, '需求不存在')
    }
    const praiseData = await findAction({
      ip,
      thingId: id,
      type: ActionType.PRAISE
    })
    if (praiseData.length) {
      return Response.fail(1, '已经点赞过了')
    }
    await addAction({
      type: ActionType.PRAISE,
      thingId: id,
      ip
    })
  }
}
