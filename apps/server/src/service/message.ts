import {
  findCollection,
  insertCollection,
  updateCollection
} from '@/lib/dbConnect/mongodb'
import { getUniqueKey } from '@/utils/stringUtil'
import { Message, MessageStyle, MessageType } from '../db/model/message'
import { selectAllUser } from '../db/userDb'

class MessageService {
  sendMessage(source: number, target: number, text: string) {
    return insertCollection<Message>('message', {
      id: getUniqueKey(),
      source,
      target,
      type: MessageType.USER_PUSH,
      style: MessageStyle.Dialog,
      date: new Date(),
      text,
      read: false
    })
  }

  async sendGlobalMessage(source: number, text: string) {
    const users = await selectAllUser(['id'])
    return insertCollection<Message>(
      'message',
      users.map((u) => {
        return {
          id: getUniqueKey(),
          source,
          target: u.id,
          type: MessageType.GLOBAL_PUSH,
          style: MessageStyle.Dialog,
          date: new Date(),
          text,
          read: false
        }
      }),
      true
    )
  }

  getMessageList(userId: number) {
    return findCollection<Message>('message', { target: userId }).then((v) => {
      v.sort((a, b) => b.date.getTime() - a.date.getTime())
      return v
    })
  }

  readMessage(userId: number, msgId: string) {
    return updateCollection<Message>(
      'message',
      { target: userId, id: msgId },
      {
        $set: {
          read: true
        }
      }
    )
  }

  clearMessageFormat(title: string, lines: string[], callMe = true) {
    return `<section id="nice" data-tool="mdnice编辑器" data-website="https://www.mdnice.com" style="font-size: 16px; color: black; padding: 0 10px; line-height: 1.6; word-spacing: 0px; letter-spacing: 0px; word-break: break-word; word-wrap: break-word; text-align: left; font-family: Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;"><h2 data-tool="mdnice编辑器" style="margin-top: 30px; padding: 0px; font-weight: bold; font-size: 22px; border-bottom: 2px solid rgb(89,89,89); margin-bottom: 30px; color: rgb(89,89,89);"><span class="prefix" style="display: none;"></span><span class="content" style="font-size: 22px; display: inline-block; border-bottom: 2px solid rgb(89,89,89);">${title}</span><span class="suffix"></span></h2>
    ${lines
      .map(
        (v) =>
          `<p data-tool="mdnice编辑器" style="font-size: 16px; padding-top: 8px; padding-bottom: 8px; margin: 0; line-height: 26px; color: rgb(89,89,89);"><strong style="font-weight: bold; color: rgb(71, 193, 168);">${v}</p>`
      )
      .join('')}
  ${
    callMe
      ? '<figure data-tool="mdnice编辑器" style="margin: 0; margin-top: 10px; margin-bottom: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center;"><img src="https://img.cdn.sugarat.top/mdImg/MTY3ODAwMDI5NDY4NQ==678000294685" alt style="display: block; margin: 0 auto; max-width: 100%;"></figure>'
      : ''
  }
  </section>`
  }
}

export default new MessageService()
