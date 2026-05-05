# 系统管理

使用系统账号首次登录后会看到

![](https://cdn.upyun.sugarat.top/mdImg/sugar/0567e0569aab337c1230588c19f7c7ed)

## 1. 数据库配置

### 1.1 MySQL

首次初始化：按需修改填写数`据库名`；然后再填写访问数据库的`用户名`和`密码`（这块是安装数据库 或者 设置数据库时生成的）

![](https://cdn.upyun.sugarat.top/mdImg/sugar/210b42340d744c9cf2d861c87e70b4c9)

然后点击保存即可，自动完成数据库的创建（存在则跳过）和表结构的导入。

如果提示不存在，点击`开启并保存`即可（有数据库没表结构也选择这个）

![](https://cdn.upyun.sugarat.top/mdImg/sugar/efddc249d93257ecf0bb2f4ac9abb0e6)

导入成功，就能看到正确的运行状态和表结构信息。

![](https://cdn.upyun.sugarat.top/mdImg/sugar/cca1e74369e5030125e4371beae9f152)

### 1.2 MongoDB

默认 27017 无需鉴权，无特殊情况不用修改。

![](https://cdn.upyun.sugarat.top/mdImg/sugar/f795f9fa5a07f93410ab5f9314c9140c)

## 2. 七牛云配置

用于实际存储文件的 OSS 服务。

![](https://cdn.upyun.sugarat.top/mdImg/sugar/d1442905106ebf676153c126670ef085)

相关配置的获取参考 [接入七牛云](../../deploy/qiniu.md)

---

:::tip
到这里，完成配置后。整个系统就可用了。
:::

## 3. 创建管理员账号

管理员账号拥有修改一些平台级配置的能力。

![](https://cdn.upyun.sugarat.top/mdImg/sugar/645de8b309d4835a673b24e4eba9f20c)

## 4. 短信验证码登录（可选）

内置集成了腾讯云短信服务，配置后就可用。

:::tip
针对个人的短信功能的相关法律法规权限已经收紧，个人账户比较难申请了。
:::

![](https://cdn.upyun.sugarat.top/mdImg/sugar/bbc8e978b4589f77f44715e8a91f90fe)
