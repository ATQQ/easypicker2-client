# 更新日志

> 问题反馈交流新“地盘” => [EasyPicker](https://support.qq.com/product/444158)

- 线上测试地址 1：<https://ep.dev.sugarat.top/>
- 线上测试地址 2：<https://ep.test.sugarat.top/>

:::tip 线上重新部署

```sh
q ep deploy

┌   部署 EasyPicker 项目
│
◆  选择部署端
│  ● 客户端 - client
│  ○ 数据库 - mysql
│  ○ 服务端 - server
└
```

:::details 交互式部署结果

```sh
┌   部署 EasyPicker 项目
│
◇  选择部署端
│  客户端 - client
│
◇  选择部署版本
│  稳定版 - latest
│
◇  选择具体版本
│  2.5.0
│
◇  资源包拉取完成 (easypicker2-client-2.5.0.tgz)
│
◇  资源解压完成（目录：./dist）
│
└  部署完成！🎉，记得设置 nginx 访问目录为 dist 目录

```

:::

:::details 没安装请先安装工具

```sh
# 安装工具
npm i -g @sugarat/cli --registry=https://registry.npmmirror.com

# 安装插件
q add ep

# 更新插件
q update
```

详细用法参考，[最新部署文档 V3](../deploy/online-v3.md)
:::

:::details 开发中的 - beta版本

## v2.7.0-beta.x <Badge text="beta" type="warning"/>

> 不代表最终结果，大家可以加群反馈交流

### Feature

- [ ] 限制提交次数，自动覆盖
- [ ] 任务支持多个账号共享查看数据
- [ ] 支持用户自主绑定/换绑手机号
- [ ] 支持提交页进行任务切换
- [ ] 有人提交就推送消息
- [ ] 收集完毕后把文件收集情况推送到指定邮箱
- [ ] 支持设置通告
- [ ] 一段时间内再次打开显示最近文件上传记录
- [ ] 其它类型文件预览(视频，office 等)
- [ ] 单文件不同的提交表单
- [ ] 支持对接网盘管理工具

### Chore

- [ ] 交互优化
  - [ ] 任务信息编辑
  - [ ] 移动端交互优化
- [ ] 内容审核配置引导
- [ ] all in Bun
- [ ] 仓库重构 => monorepo
- [ ] 首页样式优化（醒目的登录入口）
- [ ] 上传下载重构，抽象通用类，便于任何 OSS 的对接
- [ ] 文档更新
- [ ] docker 镜像
- [ ] 部署流程更加简单
- [ ] 不依赖 OSS 版本

:::

## v2.7.3 (2024/11/12) <Badge text="最新版" type="tip"/>

### Bugfix

- fix: 导出记录文件名异常
- fix: cli 安装服务端时卡在依赖安装

## v2.7.2 (2024/11/06)

### Bugfix

- fix: 查询提交情况，自动跳转登录

### Feature

- feat: 支持复制带任务名和应用名的分享链接

管理员可在配置面板修改展示的名称，设置为空则不展示

|                                      效果                                       |                                    修改名称                                     |
| :-----------------------------------------------------------------------------: | :-----------------------------------------------------------------------------: |
| ![](https://cdn.upyun.sugarat.top/mdImg/sugar/2393ca4f164ce53c4232956900ff0405) | ![](https://cdn.upyun.sugarat.top/mdImg/sugar/a27a1aab5ea576a72f2db0e5c26bb35f) |

## v2.7.1 (2024/10/24)

### Bugfix

- 下拉和多选无法设置超过 2 个
- 导入 sql 错误

## v2.7.0 (2024/08/11)

### Feature

- 展示文件下载次数
- 数据导出添加任务名
- 统一平台下载链接格式
- 全局配置项支持
  - 可选开启注册必须绑定手机
  - 支持上传功能的卡控（存储/费用）
  - 链接过期时间可配置
  - 表单项与输入长度可配置
- 管理员功能
  - OSS 文件数量，单文件平均大小
  - 不同类型累计下载次数和流量
  - 用户列表多样化排序支持
  - 计费信息展示

### Bugfix

- 文件后缀大小写敏感导致无法上传
- 异常表单数据导致导出失败
- 配置更新报错

### Chore

- 依赖升级
- 代码优化

## v2.6.0 (2024/06/24)

### Feature

- 禁用注册后，隐藏相关注册入口，禁用注册接口调用
- 文件后缀校验不区分大小写
- 空间容量限制，单用户默认 2GB 空间，管理员不受限制
  - 防止预期外产生过多的存储费用

### Chore

- 默认限制输入长度调整为 20
- CLI 优化
  - npm 分发资源
  - 提供操作菜单交互，简化操作

### Bugfix

- 上传超大文件时数据无法落库
- 修改绑定表单字段报错
- 修改配置不同步环境变量
- user-config 解析报错

## v2.5.0 (2023/11/08)

### Feature

- 用户列表支持id展示
- 添加token自动刷新机制
- 支持一键下线用户账号
- 支持设置限制提交绑定的表单项

### Bugfix

- 系统账号登出时越权报错
- 封禁账号未实时生效
- 一些列安全问题修复
- 系统账号无法登录
- TypeError ddl.getTime is not a function
- 编辑时表单没有渲染

### Chore

- pnpm 切换到 v8
- 部分依赖升级
- 使用 cross-env 处理环境变量
- 后端服务架构升级
- 引入 typeorm 操作数据库
- 添加 listWithUrl接口
- 配置文件里 localhost 切换为 ip
- docker 镜像支持
- 部署 CLI更新

## v2.4.3 (2023/03/07)

### Bugfix

- fix: 后台修改mysql端口和地址不生效的问题

### Chore

- 加强接口鉴权逻辑
- 清理历史TODO
- 补全系统操作文档的引导

## v2.4.2 (2023/03/06)

### Bugfix

- fix: 登录后台提示无权限，反复跳转到登录

## v2.4.1 (2023/03/05)

### Chore

- 用户列表支持按文件数量排序
- 空间占用检测兼容Easypicker1时期数据

## v2.4.0 (2023/03/05)

### Feature

- 管理后台
  - 支持向用户推送消息（单独，全局）
  - 支持查看提交文件数量
  - 支持查看用户占用的云空间大小
  - 支持一键清理文件，并推送站内消息（账号维度，避免文件长时间占用空间）
    - ![](https://img.cdn.sugarat.top/mdImg/MTY3NzY4MTY3MzUwMw==677681673503)
    - ![](https://img.cdn.sugarat.top/mdImg/MTY3NzY4MTY2ODMyNQ==677681668325)
    - ![](https://img.cdn.sugarat.top/mdImg/MTY3ODAwMTE0MTA0OQ==678001141049)
- 任务删除支持回收站（避免误删任务，导致文件错乱）
  - ![](https://img.cdn.sugarat.top/mdImg/MTY3Nzc2Njc2MzUwMg==677766763502)
- 批注支持设置图片（最多3张）
  - ![](https://img.cdn.sugarat.top/mdImg/MTY3NzkxNzczODAyNg==677917738026)

### Bugfix

- patch MySQL逻辑与sql不一致
- redis缓存数据在不同站点之间相互影响
- 部分varchar字段极端情况溢出

### chore

- 全新的[部署文档](./../deploy/online-new.md)
- 提供一键部署前后端资源的CLI
  - [Github: @sugarat/cli](https://github.com/ATQQ/tools/tree/main/packages/cli/dynamic-cli/core)
  - [Github: @sugarat/cli-plugin-ep](https://github.com/ATQQ/tools/tree/main/packages/cli/dynamic-cli/plugins/cli-plugin-ep)
- 文件软删除逻辑优化，添加字段标识
- sql脚本更新

## v2.3.4 (2023/02/12)

### Feature

- 优化PV上报逻辑，同域避免重复上报
- 退出登录调用logout接口，同时过期token
- 文件相关的日志添加大小信息

### Chore

- 本地开发访问线上dev环境脚本完善
- 面板的用户列表进行逆序查询

## v2.3.3 (2022/11/08)

### Bugfix

- 修复中文与特殊字符并存，导致文件下载失败场景

### Chore

- 新增归档失败类型，完善错误引导

## v2.3.2 (2022/11/07)

### Bugfix

- 修改文件名时对传入内容进行合法性校验，避免出现windows操作系统不合法字符
- 修复文件名中出现`#`符号时文件无法下载

### Chore

- 还原归档完成时的下载逻辑还原：自动触发下载的同时展示二维码和url弹窗
- 文件列表信息不展示id

## v2.3.1 (2022/11/02)

### Chore

- 还原提交表单的`placeholder`文案

## v2.3.0 (2022/10/30)

### Feature

- 表单项数放开到10项（原来6）
- 单独展示历史下载记录（普通下载&归档下载）
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2NTE1MzY0MDU5OQ==665153640599)
- 单独的归档展示面板。刷新页面也不会丢失归档任务
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2NTIzOTc1NjIxMg==665239756212)
- 支持移动端滑动任务设置面板的顶部菜单
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2NTQxMjkzMTIxOQ==665412931219)
- 图片预览优化
  - 自动记住用户上次的开启状态
  - 控制条位置展示选中的图片名称
    - ![](https://img.cdn.sugarat.top/mdImg/MTY2NTQxMjc3MTQ2Mw==665412771463)

### Bugfix

- 设置填写信息弹窗，在PC侧被拖动后无法复原的问题（禁止弹窗拖动）
- 批注信息内容过多，内容被截断
- build `unplugin-element-plus` warn
- 同一时间上传的图片预览错位（取消表格数据的自定义排序）
- 修复内容截断的问题，使用新的表单填写布局
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2NzEzNDcyMDczOA==667134720738)

### Chore

- 新的反馈交流渠道：<https://support.qq.com/product/444158>

## v2.2.1 (2022/10/05)

### BugFix

- 表单项过多，无法渲染，同时影响创建更新
- Excel文件下载失败、Excel报表下载打开乱码(部分浏览器)

### Chore

- 部分页面追加底部导航，引导问题反馈

## v2.2.0 (2022/09/17)

### Feature

- 文档站支持全文的内容搜素，Power By [Algolia](https://www.algolia.com/developers/?utm_content=powered_by&utm_source=localhost&utm_medium=referral&utm_campaign=docsearch)
- 新增单独的服务配置面板，降低服务部署成本，对应路由 `dashboard/config`
  - 支持直接修改各种数据库配置（后续将会提供更多服务运维相关的操作）
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1OTg2ODY2MjY3NQ==659868662675)
- 直接直接在面板中修改提交的文件名
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2MDU0MTIxNzYzMw==660541217633)
- 支持一键清理归档文件产生的的txt中间文件
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2MDU0MTM4ODI5MQ==660541388291)
- 登录过期重定向登录页优化，重新登录后自动回到之前的页面
- 任务截止不展示提示信息，截止UI优化
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2MDU0MTc1NjMyMA==660541756320)
- 支持用户直接添加”限制人员“
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2MjI5NjMzNzMxMw==662296337313)
- 支持管理员限制部分页面访问
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2Mjk4NjMyMzAxOA==662986323018)
- 提交文件相关：支持限制文件类型，文件大小，单次最大上传数量
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2MzM5NzU5NjExNQ==663397596115)
- 支持下划线（\_）加号（+）等作为文件分隔符
  - ![](https://img.cdn.sugarat.top/mdImg/MTY2MzQwNDA1OTI5MQ==663404059291)

### BugFix

- 引导文案的校对
- 404页面重复跳转
- 图片，pdf等会被浏览器直接预览的资源在部分设备上下载失败
- 通过添加响应头解决,图片,pdf等资源被浏览器直接预览的情况
- 直接访问管理面板报错
- 无线重定向到登录页

### Chore

- [Vite](https://vitejs.dev/)升级 Use 3.x
- [element UI](https://element-plus.gitee.io/zh-CN/component/button.html) 升级，部分API调整
- 其它依赖库升级

## v2.1.8

### Feature

- 添加需求管理面板
- 在文档站中展示 [⭐️需求墙](./wish.md)
- 简化限制人员的表单填写，避免重复填写相同内容

### Chore

- 后端[服务框架](https://github.com/ATQQ/flash-wolves)升级
  - 自动发现可用端口，端口被占用也不阻塞服务启动
- 慢查询接口优化
- 七牛OSS存储区域配置提升到`.env`配置里
- 文档站内容更新，包括但不限于以下内容
  - 文档站 `vitepress` 版本升级 => UI 全面升级
  - 添加FAQ
  - 将展示信息页面导向文档站
  - and more

### Bugfix

- fix首页👍🏻展示问题
- fix管理面板的导航，高亮Tab状态异常
- 日志面板的重复查询请求
- 导出数据支持原文件名这一项

## v2.1.7

### Bugfix

- 管理面板有权限的情况下刷新404

### Chore

- 调整提交文件按钮尺寸
- 提示文案更新

## v2.1.6

### Feature

- 管理面板中将 "文件数量" 调整为 "记录/OSS"
  - 记录即`提交记录数量`
  - OSS即`云上实际存在的文件数量`
- 上传表单信息支持`单选`，`下拉选择`，`固定内容`
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjU2ODcyNg==651496568726)
- 任务支持设置批注
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjI2OTI0MQ==651496269241)
- 上传的文件支持查看原文件名
- 支持直接从任务卡片跳转到文件面板展示对应任务数据
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MTU2MzY3MTQzMA==651563671430)
- 支持查看已收集文件的大小
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MTU2MzU2ODk4Mg==651563568982)
- 添加赞赏入口
- 管理端支持直接重置密码/换绑手机号

### Chore

- 提交面板默认展示删除文件icon
- 更新模板下载提示文案
- 慢查询优化
- 列表数据增加`Loading`状态优化交互

### Bugfix

- 验证码登录不支持19x，放开对手机号的严格限制
- 上传时可修改表单内容
- 未正确处理文件名中特殊字符`?`
- PC/H5来回切换导航栏展示异常
- H5侧删除弹窗展示异常

<!-- * ~ 重命名文件后缀从头开始读取，兼容 `.d.ts`,`.tar.gz` 等情况 ~
  * 部分文件包含较多无用信息 -->

## v2.1.5

### Feature

- 支持从其它任务导入限制人员
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MDYzODMzNTI5Mw==650638335293)
- 支持从其它任务导入表单信息
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MDYzODU5OTQ2Mg==650638599462)
- 支持手动清理OSS上已失效的归档文件，节约存储空间
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MDYzODczNzUyMw==650638737523)
- 文档支持图片预览
- PC侧支持拖拽上传
- 提交信息页支持控制姓名展示

### Chore

- 移除CNZZ统计
- UI/UE优化
- 保存表单信息，添加防抖避免反复触发
- 升级 Element UI 版本

### UI/UE

- 优化登录页的UI
- 优化表单信息设置页的UI
- DDL面板UI和文案优化
- 优化任务提交页UI
- 优化移除未上传文件的交互逻辑

## v2.1.4

### Feature

- 信息维护面板，简单显示帮助提示信息 + 图例
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MDE4Mzg4NjUzMw==650183886533)
- 文件提交页增加提示文案
  - ![](https://img.cdn.sugarat.top/mdImg/MTY1MDE4NDE0MTE0MA==650184141140)

### Chore

- 升级客户端 qiniu-sdk版本

### Bugfix

- 文件提交页交互缺陷修复
- 图片/PDF/视频等浏览器支持预览的文件将会直接进行预览
  - 改由应用去控制此类文件的下载 ![](https://img.cdn.sugarat.top/mdImg/MTY1MDE4NDM0Nzg2NA==650184347864)
- 批量删除文件的误删
- 撤回文件误删

## v2.1.3

### Bugfix

- 提交文件面板，未选择文件时可点击提交文件并进行后续逻辑
- 单个文件记录删除，导致关联文件被误删
- 将无关联任务的文件，单独展示出来
  - ![](https://img.cdn.sugarat.top/mdImg/MTY0OTkzNjA2OTY1Ng==649936069656)

### Chore

- 优化删除提示文案”数据无价，谨慎操作“

## v2.1.2

### Feature

- 文件列表支持图片数据预览

### Chore

- 更新导航栏展示数据

## v2.1.1

### Chore

- 支持日志搜索

## v2.1.0

### Feature

- 优化提交记录的Excel导出格式
  - ![](https://img.cdn.sugarat.top/mdImg/MTY0OTgxNTg0MDg1Mg==649815840852)

### Chore

- 添加[51la](https://v6.51.la/)的的数据统计SDK

### BugFix

- 文件面板，批量操作卡顿问题修复

## v2.0.8

### Bugfix

- 提交查询权限一定几率的失败

## v2.0.7

### Feature

- 支持导出日志数据

## v2.0.6

### Feature

- 人员提交情况面板，展示提交文件数量
- 管理员面板支持查看详细日志信息

### Chore

- 优化批量下载错误提示信息
- 日志切换为分页接口

## v2.0.5

### Feature

- 优化截止日期设置面板的提示文案

### Bugfix

- 批量下载由于特殊字符“•”导致下载失败

### Chore

- 优化批量下载错误提示信息

## v2.0.4

### Feature

- 人员提交情况面板展示序号

## v2.0.3

### Chore

- UE/UE:一系列样式与交互优化...
