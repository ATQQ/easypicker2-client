import { App } from '@vue/runtime-core'

// import {
//   ElButton, ElInput, ElPopover, ElTag,
//   ElSelect, ElOption, ElCard, ElEmpty,
//   ElForm, ElFormItem, ElDialog, ElImage,
//   ElTabs, ElTabPane, ElDatePicker, ElTimePicker, ElTimeSelect,
// } from 'element-plus'
// import 'element-plus/packages/theme-chalk/src/icon.scss'

// import lang from 'element-plus/lib/locale/lang/zh-cn'
// import 'dayjs/locale/zh-cn'
// import locale from 'element-plus/lib/locale'

// // 设置语言
// locale.use(lang)

// const components = [
//   ElSelect,
//   ElOption,
//   ElCard,
//   ElEmpty, ElImage,
//   ElTabs, ElTabPane,
//   ElDatePicker,
//   ElTimePicker,
//   ElTimeSelect,
//   ElDatePicker,
//   ElForm, ElFormItem, ElDialog,
//   ElButton, ElInput, ElPopover, ElTag]
import ElementPlus from 'element-plus'
import 'element-plus/lib/theme-chalk/index.css'
import 'dayjs/locale/zh-cn'
import locale from 'element-plus/lib/locale/lang/zh-cn'

export default function mountElementUI(app: App<Element>) {
  app.use(ElementPlus, { locale })
  // components.forEach((c) => {
  //   app.component(c.name, c)
  // })
}
