import { App } from '@vue/runtime-core'
import {
  ElButton, ElInput, ElPopover, ElTag,
  ElSelect, ElOption, ElCard, ElEmpty,
  ElForm, ElFormItem, ElDialog, ElImage,
} from 'element-plus'
import 'element-plus/packages/theme-chalk/src/icon.scss'

const components = [
  ElSelect,
  ElOption,
  ElCard,
  ElEmpty, ElImage,
  ElForm, ElFormItem, ElDialog,
  ElButton, ElInput, ElPopover, ElTag]
export default function mountElementUI(app: App<Element>) {
  components.forEach((c) => {
    app.component(c.name, c)
  })
}
