---
outline: [2, 3]
---

# 宝塔新机器 MongoDB 配置 SOP

适用：通过宝塔软件商店安装的 MongoDB（路径通常为 `/www/server/mongodb/`）。

用于新机器交付、扩容换机，或线上 Mongo 异常后的加固。配套主流程见 [宝塔面板部署](./baota.md)。

本文按 **2026 实操**（含 OOM 事故 + 新机器交付踩坑）整理：按顺序做完即可。

## 要解决什么

| 问题       | 表现                                              | 根因                                                                                                  |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| OOM 杀进程 | mongod 半夜消失，日志有 `unclean shutdown`        | 未限制 `cacheSizeGB`，缓存可吃到 1GB+                                                                 |
| 服务冲突   | `mongodb` / `mongod` 同时起，抢端口或日志权限报错 | 系统自带 `mongod.service` 与宝塔 `mongodb.service` 并存                                               |
| 崩溃不恢复 | 进程没了，服务显示 `active (exited)`              | SysV 生成单元默认 `Restart=no`，且 **不跟踪 fork 出的 mongod**（无 `PIDFile`、`RemainAfterExit=yes`） |

加固目标：

1. 限制 WiredTiger 缓存，避免 OOM
2. 只保留宝塔这一套 `mongodb` 服务
3. systemd 能跟踪 `MainPID`，崩溃 / OOM / `kill -9` 后约 10 秒自动拉起

---

## 1. 安装（宝塔面板）

1. 软件商店 → 安装 **MongoDB**
2. SSH 确认：

```bash
ps aux | grep '[m]ongod'
ls -la /www/server/mongodb/bin/mongod
ls -la /www/server/mongodb/config.conf
ls -la /etc/init.d/mongodb
```

四项都应存在；`/etc/init.d/mongodb` 是宝塔启动脚本，后面由 systemd 调用。

---

## 2. 一键诊断（先看现状）

```bash
echo "========== 1. 内存 =========="
free -h

echo ""
echo "========== 2. MongoDB 进程 =========="
ps aux | grep '[m]ongod' || echo "mongod 未运行"

echo ""
echo "========== 3. 服务冲突检查 =========="
echo "mongodb → $(systemctl is-active mongodb 2>/dev/null || echo missing)"
echo "mongod  → $(systemctl is-active mongod 2>/dev/null || echo missing)"

echo ""
echo "========== 4. 自动重启 / 主进程跟踪 =========="
systemctl show mongodb -p Restart -p RestartSec -p RemainAfterExit -p MainPID 2>/dev/null \
  || echo "mongodb.service 尚未被 systemd 托管"
ls /etc/systemd/system/mongodb.service.d/ 2>/dev/null || echo "无 mongodb drop-in"

echo ""
echo "========== 5. cacheSizeGB / pidFilePath =========="
grep -nE 'cacheSizeGB|pidFilePath|wiredTiger' /www/server/mongodb/config.conf || echo "未找到相关配置"

echo ""
echo "========== 6. 监听端口 =========="
ss -tlnp | grep 27017 || echo "27017 未监听"
```

### 新机器常见诊断结果（加固前）

| 项                                            | 常见现状              | 是否正常       |
| --------------------------------------------- | --------------------- | -------------- |
| 内存约 4G，available > 2G                     | 有 Swap 更好          | 可接受         |
| mongod 在跑，RSS ~100–200MB                   | 有进程                | 正常           |
| `mongodb` / `mongod` 都是 inactive 或 missing | 进程是面板/脚本拉起的 | 需纳入 systemd |
| `Restart=no`，无 drop-in                      | 默认 SysV 行为        | 需改           |
| 已有 `cacheSizeGB: 0.25`                      | 部分机子装时已配      | 有则跳过改配置 |
| `127.0.0.1:27017`                             | 仅本机                | 正确           |

加固完成后应变为：`Restart=always`、`RemainAfterExit=no`、`MainPID` 非 0、`active (running)`。

---

## 3. 限制内存（防 OOM）

```bash
free -h
cp /www/server/mongodb/config.conf /www/server/mongodb/config.conf.bak.$(date +%F)
```

编辑 `/www/server/mongodb/config.conf`，在 `storage` 下确保有：

```yaml
storage:
  dbPath: /www/server/mongodb/data
  directoryPerDB: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25
```

同时确认（后面 drop-in 要用）：

```yaml
processManagement:
  fork: true
  pidFilePath: /www/server/mongodb/log/configsvr.pid
```

### `cacheSizeGB` 建议

| 机器内存           | 建议值                           |
| ------------------ | -------------------------------- |
| 2GB                | `0.25`                           |
| ~4GB（常见云主机） | `0.25`（优先）；空闲多可试 `0.5` |
| 8GB+               | `0.5` ~ `1`                      |

> 这是 WiredTiger **缓存上限**，进程 RSS 会略高。约 4G 机器实测 RSS 约 180–200MB 属正常。改完后需 `systemctl restart mongodb` 才生效（见第 5 步）。

---

## 4. 消除服务冲突（有才处理）

```bash
systemctl status mongod 2>&1 | head -5
```

- 若输出 `Unit mongod.service could not be found` → **跳过本步**（新机器很常见）
- 若存在 `mongod.service`：

```bash
systemctl stop mongod
systemctl disable mongod
systemctl mask mongod   # 防止再被拉起
```

确认宝塔脚本还在：

```bash
ls -la /etc/init.d/mongodb
```

---

## 5. systemd 托管 + 崩溃自动重启【核心】

### 为什么只写 `Restart=always` 不够？

宝塔 Mongo 走 SysV → systemd 自动生成的单元大致是：

- `Type=forking`
- `RemainAfterExit=yes`
- **没有 `PIDFile`**
- `GuessMainPID=no`

结果：init 脚本里的父进程退出后，systemd 认为服务「已经成功结束」，**不跟踪**真正的 mongod。此时：

- `kill -9` / OOM 杀子进程 → 状态变成 `active (exited)`，**不会重启**
- 必须在 drop-in 里同时补：`PIDFile` + `RemainAfterExit=no` + `Restart=always`

### 操作命令（整段复制）

```bash
# 确认 pid 路径（须与 config.conf 一致；宝塔默认如下）
grep pidFilePath /www/server/mongodb/config.conf

# 开机自启（会提示 redirecting to systemd-sysv-install，正常）
systemctl enable mongodb

# drop-in：跟踪主进程 + 崩溃自动拉起
mkdir -p /etc/systemd/system/mongodb.service.d
cat > /etc/systemd/system/mongodb.service.d/override.conf <<'EOF'
[Service]
Type=forking
PIDFile=/www/server/mongodb/log/configsvr.pid
RemainAfterExit=no
Restart=always
RestartSec=10
EOF

systemctl daemon-reload
systemctl restart mongodb
```

### 若 `restart` 失败（端口占用 / auto-restart 循环）

常见原因：加固前 mongod 已在跑，systemd 再起一份抢 27017。处理：

```bash
journalctl -xeu mongodb.service -n 30 --no-pager
systemctl stop mongodb
sleep 2
pgrep -a mongod || echo "✅ 已停止"
# 若还有残留：
# kill -9 $(pgrep -x mongod)

systemctl start mongodb
```

### 验收（必须看 MainPID）

```bash
systemctl show mongodb -p Restart -p RemainAfterExit -p MainPID
systemctl status mongodb
```

期望：

```text
Restart=always
RemainAfterExit=no
MainPID=<非 0，且等于 pgrep -x mongod>
Active: active (running)
Drop-In: .../override.conf
Main PID: xxxxx (mongod)
```

开机后由 **systemd** 拉起（调用宝塔 init.d），不是面板单独启动。

---

## 6. 验证崩溃自动恢复（低峰期必做）

```bash
PID=$(pgrep -x mongod) && echo "当前 PID: $PID"
kill -9 $PID
sleep 15
NEW_PID=$(pgrep -x mongod)
echo "新 PID: $NEW_PID"
[ -n "$NEW_PID" ] && [ "$NEW_PID" != "$PID" ] && echo "✅ 已自动重启" || echo "❌ 未自动重启"
systemctl status mongodb
```

成功时 journal 类似：

```text
mongodb.service: Main process exited, code=killed, status=9/KILL
mongodb.service: Scheduled restart job, restart counter is at 1.
Started mongodb.service
```

若显示 `❌` 且状态是 `active (exited)`：回到第 5 步检查 drop-in 是否含 `PIDFile` / `RemainAfterExit=no`，以及 `MainPID` 是否非 0。

---

## 7. 业务连通性

```bash
/www/server/mongodb/bin/mongosh --eval "db.adminCommand('ping')" --quiet
ss -tlnp | grep 27017
```

应用连 `127.0.0.1:27017`，库名按环境配置（如 `ep-prod` / `ep-log`）。**不要对公网开放 27017。**

---

## 日常运维

统一用 **systemd**。不要用 `/etc/init.d/mongodb`，尽量少点宝塔启停按钮。

### 启停与状态

```bash
systemctl start mongodb
systemctl stop mongodb        # 真正停止，不会被 Restart 拉起
systemctl restart mongodb
systemctl status mongodb
systemctl is-enabled mongodb  # 应为 enabled
systemctl show mongodb -p Restart -p RemainAfterExit -p MainPID
```

### 连通 / 端口 / 进程

```bash
/www/server/mongodb/bin/mongosh --eval "db.adminCommand('ping')" --quiet
ss -tlnp | grep 27017
pgrep -a mongod
```

### 内存

```bash
free -h
ps aux | grep '[m]ongod'
# 可选：仓库 tools/check_mongo_mem.sh
```

约 4G + `cacheSizeGB: 0.25`：RSS 大约一两百 MB；长期 1GB+ 需警惕。

### 日志与宕机排查

```bash
journalctl -u mongodb -n 50 --no-pager
journalctl -xeu mongodb.service -n 30 --no-pager
tail -100 /www/server/mongodb/log/config.log
grep -iE 'oom|fatal|assert|crash|shutdown' /www/server/mongodb/log/config.log | tail -50
dmesg | grep -iE 'oom|killed|mongo'
journalctl --since "yesterday" | grep -iE 'oom|mongo'
```

### 改 `config.conf` 后

```bash
systemctl restart mongodb
systemctl status mongodb
```

### 不要这样做

| 错误做法                              | 后果                                           |
| ------------------------------------- | ---------------------------------------------- |
| 只配 `Restart=always`，不配 `PIDFile` | `kill -9`/OOM 后变成 `active (exited)`，不重启 |
| `/etc/init.d/mongodb stop`            | 与 `Restart=always` 打架，停了又起             |
| 宝塔面板点「停止」                    | 同上                                           |
| 同时启用 `mongod.service`             | 抢端口 / 抢日志                                |
| 对公网开放 27017                      | 安全风险                                       |

---

## 交付 Checklist

- [ ] MongoDB 已装，`/etc/init.d/mongodb` 存在
- [ ] `cacheSizeGB` 已按内存设置（约 4G 建议 `0.25`）
- [ ] `pidFilePath` 与 drop-in 中 `PIDFile` 一致
- [ ] 无冲突的 `mongod.service`（没有或已 mask）
- [ ] `systemctl enable mongodb` 已执行
- [ ] drop-in 含：`PIDFile` + `RemainAfterExit=no` + `Restart=always`
- [ ] `systemctl show`：`MainPID` 非 0，`RemainAfterExit=no`
- [ ] `kill -9` 后约 15 秒内自动拉起，PID 变化
- [ ] 仅监听 `127.0.0.1:27017`，应用 ping 通
- [ ] （可选）整机 reboot 后 Mongo 仍由 systemd 拉起

---

## 故障速查

| 症状                                         | 处理                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 进程没了，内核日志有 OOM                     | 降 `cacheSizeGB`，查其它吃内存进程，必要时加内存/Swap                                                   |
| `active (exited)`，mongod 已死不重启         | drop-in 缺 `PIDFile` 或仍是 `RemainAfterExit=yes`；按第 5 步重写 drop-in 后 `daemon-reload` + `restart` |
| `restart` 失败 / `activating (auto-restart)` | `systemctl stop mongodb` → 清残留 mongod → `start`                                                      |
| unclean shutdown / lock 非空                 | 异常杀进程后遗留；确认只一个服务在管，再正常 `start`                                                    |
| 面板点停止又起来                             | 预期行为；要用 `systemctl stop mongodb`                                                                 |
