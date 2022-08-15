# 更新日志
部署最新beta版步骤，见 => [私有化部署-线上部署-我要体验最新beta版](./../deploy/design/../online.md#%E6%89%A7%E8%A1%8C%E8%87%AA%E5%8A%A8%E5%8C%96%E9%83%A8%E7%BD%B2%E8%84%9A%E6%9C%AC)
* 线上测试地址：https://ep.dev.sugarat.top/


## v2.1.9-beta.x (2022/08/07)

### Feature
* 文档站支持全文的内容搜素，Power By [Algolia](https://www.algolia.com/developers/?utm_content=powered_by&utm_source=localhost&utm_medium=referral&utm_campaign=docsearch)
* 新增单独的服务配置面板，降低服务部署成本，对应路由 `dashboard/config`
  * 支持直接修改各种数据库配置（后续将会提供更多服务运维相关的操作）
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1OTg2ODY2MjY3NQ==659868662675" style="height:100px;" />
* 直接直接在面板中修改提交的文件名
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY2MDU0MTIxNzYzMw==660541217633" style="height:100px;"/>
* 支持一键清理归档文件产生的的txt中间文件
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY2MDU0MTM4ODI5MQ==660541388291" style="height:100px;"/>
* 登录过期重定向登录页优化，重新登录后自动回到之前的页面
* 任务截止不展示提示信息，截止UI优化
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY2MDU0MTc1NjMyMA==660541756320" style="height:100px;"/>

### BugFix
* 引导文案的校对
* 404页面重复跳转
* 图片，pdf等会被浏览器直接预览的资源在部分设备上下载失败
* 通过添加响应头解决,图片,pdf等资
源被浏览器直接预览的情况

### Chore
* [Vite](https://vitejs.dev/)升级 Use 3.x
* [element UI](https://element-plus.gitee.io/zh-CN/component/button.html) 升级，部分API调整
* 其它依赖库升级

## v2.1.8
### Feature
* 添加需求管理面板
* 在文档站中展示 [⭐️需求墙](./wish.md)
* 简化限制人员的表单填写，避免重复填写相同内容

### Chore
* 后端[服务框架](https://github.com/ATQQ/flash-wolves)升级
  * 自动发现可用端口，端口被占用也不阻塞服务启动
* 慢查询接口优化
* 七牛OSS存储区域配置提升到`.env`配置里
* 文档站内容更新，包括但不限于以下内容
  * 文档站 `vitepress` 版本升级 => UI 全面升级
  * 添加FAQ
  * 将展示信息页面导向文档站
  * and more

### Bugfix
* fix首页👍🏻展示问题
* fix管理面板的导航，高亮Tab状态异常
* 日志面板的重复查询请求
* 导出数据支持原文件名这一项

## v2.1.7
### Bugfix
* 管理面板有权限的情况下刷新404

### Chore
* 调整提交文件按钮尺寸
* 提示文案更新

## v2.1.6
### Feature
* 管理面板中将 "文件数量" 调整为 "记录/OSS"
  * 记录即`提交记录数量`
  * OSS即`云上实际存在的文件数量`
* 上传表单信息支持`单选`，`下拉选择`，`固定内容`
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjU2ODcyNg==651496568726" style="height:100px;" />
* 任务支持设置批注
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjI2OTI0MQ==651496269241" style="height:100px;" />
* 上传的文件支持查看原文件名
* 支持直接从任务卡片跳转到文件面板展示对应任务数据
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MTU2MzY3MTQzMA==651563671430" style="height:100px;" />
* 支持查看已收集文件的大小
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MTU2MzU2ODk4Mg==651563568982" style="width:200px;" />
* 添加赞赏入口
* 管理端支持直接重置密码/换绑手机号

### Chore
* 提交面板默认展示删除文件icon
* 更新模板下载提示文案
* 慢查询优化
* 列表数据增加`Loading`状态优化交互

### Bugfix
* 验证码登录不支持19x，放开对手机号的严格限制
* 上传时可修改表单内容
* 未正确处理文件名中特殊字符`?`
* PC/H5来回切换导航栏展示异常
* H5侧删除弹窗展示异常

<!-- * ~ 重命名文件后缀从头开始读取，兼容 `.d.ts`,`.tar.gz` 等情况 ~
  * 部分文件包含较多无用信息 -->
## v2.1.5
### Feature
* 支持从其它任务导入限制人员
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MDYzODMzNTI5Mw==650638335293" style="height:100px;" />
* 支持从其它任务导入表单信息
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MDYzODU5OTQ2Mg==650638599462" style="width:200px;"/>
* 支持手动清理OSS上已失效的归档文件，节约存储空间
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MDYzODczNzUyMw==650638737523" style="width:200px;"/>
* 文档支持图片预览
* PC侧支持拖拽上传
* 提交信息页支持控制姓名展示

### Chore
* 移除CNZZ统计
* UI/UE优化
* 保存表单信息，添加防抖避免反复触发
* 升级 Element UI 版本

### UI/UE
* 优化登录页的UI
* 优化表单信息设置页的UI
* DDL面板UI和文案优化
* 优化任务提交页UI
* 优化移除未上传文件的交互逻辑

## v2.1.4
### Feature
* 信息维护面板，简单显示帮助提示信息 + 图例
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MDE4Mzg4NjUzMw==650183886533" style="height:100px;"/>
* 文件提交页增加提示文案
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MDE4NDE0MTE0MA==650184141140" style="height:100px;"/>

### Chore
* 升级客户端 qiniu-sdk版本

### Bugfix
* 文件提交页交互缺陷修复
* 图片/PDF/视频等浏览器支持预览的文件将会直接进行预览
  * 改由应用去控制此类文件的下载 <Picture src="https://img.cdn.sugarat.top/mdImg/MTY1MDE4NDM0Nzg2NA==650184347864" style="height:100px;"/>
* 批量删除文件的误删
* 撤回文件误删

## v2.1.3
### Bugfix
* 提交文件面板，未选择文件时可点击提交文件并进行后续逻辑
* 单个文件记录删除，导致关联文件被误删
* 将无关联任务的文件，单独展示出来
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY0OTkzNjA2OTY1Ng==649936069656" style="width:200px;"/>

### Chore
* 优化删除提示文案”数据无价，谨慎操作“
## v2.1.2
### Feature
* 文件列表支持图片数据预览
### Chore
* 更新导航栏展示数据

## v2.1.1
### Chore
* 支持日志搜索

## v2.1.0
### Feature
* 优化提交记录的Excel导出格式
  * <Picture src="https://img.cdn.sugarat.top/mdImg/MTY0OTgxNTg0MDg1Mg==649815840852" />

### Chore
* 添加[51la](https://v6.51.la/)的的数据统计SDK
### BugFix
* 文件面板，批量操作卡顿问题修复

## v2.0.8
### Bugfix
* 提交查询权限一定几率的失败

## v2.0.7
### Feature
* 支持导出日志数据

## v2.0.6
### Feature
* 人员提交情况面板，展示提交文件数量
* 管理员面板支持查看详细日志信息

### Chore
* 优化批量下载错误提示信息
* 日志切换为分页接口

## v2.0.5
### Feature
* 优化截止日期设置面板的提示文案

### Bugfix
* 批量下载由于特殊字符“•”导致下载失败

### Chore
* 优化批量下载错误提示信息

## v2.0.4
### Feature
* 人员提交情况面板展示序号

## v2.0.3
### Chore
* UE/UE:一系列样式与交互优化...