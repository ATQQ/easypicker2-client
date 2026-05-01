export enum MessageType {
  GLOBAL_PUSH,
  USER_PUSH
}

export enum MessageStyle {
  Dialog,
  Notification,
  MESSAGE,
  Link
}

export interface Message {
  id: string
  source: number
  target: number
  type: MessageType
  style: MessageStyle
  date: Date
  text: string
  read: boolean
}
