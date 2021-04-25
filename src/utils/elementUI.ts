import { App } from '@vue/runtime-core'

// // 按需引入
// import {
//   ElButton, ElInput, ElPopover, ElTag,
//   ElSelect, ElOption, ElCard, ElEmpty,
//   ElForm, ElFormItem, ElDialog, ElImage,
//   ElTabs, ElTabPane, ElDatePicker, ElTimePicker,
//   ElTimeSelect,
//   ElDropdown, ElDropdownItem,
//   ElTable, ElTableColumn, ElPagination, ElRadio,
//   ElRadioGroup, ElRadioButton, ElAffix, ElUpload,
//   ElDivider, ElCheckbox, ElSwitch, ElDropdownMenu,
//   ElMenuItem, ElMenu, locale,
// } from 'element-plus'
// import 'element-plus/packages/theme-chalk/src/icon.scss'

// import lang from 'element-plus/lib/locale/lang/zh-cn'
// import 'dayjs/locale/zh-cn'

// locale(lang)

// const components = [
//   ElSelect,
//   ElOption,
//   ElEmpty, ElImage,
//   ElTabs, ElTabPane,
//   ElDatePicker,
//   ElTimePicker,
//   ElTimeSelect,
//   ElForm, ElFormItem, ElDialog,
//   ElButton, ElInput, ElPopover, ElTag, ElDropdown,
//   ElDropdownItem, ElTable, ElTableColumn, ElPagination,
//   ElRadio, ElRadioGroup, ElRadioButton, ElAffix,
//   ElCard, ElUpload, ElDivider,
//   ElCheckbox, ElSwitch, ElDropdownMenu, ElMenuItem, ElMenu]

// export default function mountElementUI(app: App<Element>) {
//   components.forEach((c) => {
//     app.component(c.name, c)
//   })
// }

// 全量引入
import ElementPlus from 'element-plus'
import 'element-plus/lib/theme-chalk/index.css'
import 'dayjs/locale/zh-cn'
import locale from 'element-plus/lib/locale/lang/zh-cn'

export default function mountElementUI(app: App<Element>) {
  app.use(ElementPlus, { locale })
}
