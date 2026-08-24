#!/usr/bin/env bash
# EasyPicker2 一体化容器入口（幂等）
# 启动顺序：MariaDB → MongoDB → Nginx → Node 应用（由 PM2 托管，前台 PID 经 tini）
# 设计要点：
#   - MariaDB 数据目录为空时才初始化，root 无密码时才设置密码 → 重启/更新镜像不重复操作
#   - 不再手动导入 SQL，交由应用 ensureMysqlBootstrap() 自动建库+导表
#   - schema 对齐由应用 runMysqlPatchesOnStartup() 每次启动自动执行
#   - Node 由 PM2 托管：崩溃只重启 Node，不影响同容器的 MariaDB/MongoDB/Nginx
set -euo pipefail

MYSQL_DATA_DIR=/var/lib/mysql
MYSQL_RUN_DIR=/var/run/mysqld
MYSQL_ROOT_PASSWORD="${MYSQL_DB_PWD:-easypicker2}"
MYSQL_DATABASE="${MYSQL_DB_NAME:-easypicker2}"
MONGO_DATA_DIR=/var/lib/mongo
MONGO_LOG=/var/log/mongodb/mongod.log

log() { echo "[entrypoint] $*"; }

wait_for() {
  # $1: 检查命令（成功返回0即视为就绪）  $2: 最大重试次数  $3: 描述
  local check_cmd="$1" max="${2:-30}" desc="${3:-service}"
  local i=0
  until eval "$check_cmd" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge "$max" ]; then
      echo "[entrypoint] ❌ $desc 启动超时" >&2
      return 1
    fi
    sleep 1
  done
  log "$desc 就绪"
}

# ---------------- 1. MariaDB ----------------
# 容器内以 root 运行，避免 bind mount 宿主目录权限问题
mkdir -p "$MYSQL_DATA_DIR" "$MYSQL_RUN_DIR"

# 首次启动：数据目录为空 → 初始化（normal 模式，root 初始无密码）
if [ ! -d "$MYSQL_DATA_DIR/mysql" ]; then
  log "初始化 MariaDB 数据目录..."
  if command -v mariadb-install-db >/dev/null 2>&1; then
    mariadb-install-db --user=root --datadir="$MYSQL_DATA_DIR" \
      --auth-root-authentication-method=normal >/dev/null 2>&1
  else
    mysql_install_db --user=root --datadir="$MYSQL_DATA_DIR" \
      --auth-root-authentication-method=normal >/dev/null 2>&1
  fi
fi

# 启动 MariaDB（后台，以 root 运行）
mysqld_safe --user=root --datadir="$MYSQL_DATA_DIR" >/var/log/mysql_safe.log 2>&1 &
wait_for "mysqladmin --protocol=socket -uroot ping" 60 "MariaDB"

# 设置 root 密码与远程主机账号（仅当 root 当前无密码时执行，幂等）
if mysql --protocol=socket -uroot -e "SELECT 1" >/dev/null 2>&1; then
  log "首次启动，设置 MariaDB root 凭据..."
  mysql --protocol=socket -uroot <<-EOSQL
    ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
    CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
    CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
    GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
    GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' WITH GRANT OPTION;
    FLUSH PRIVILEGES;
EOSQL
fi

# ---------------- 2. MongoDB ----------------
# 容器内以 root 运行，避免 bind mount 宿主目录权限问题
mkdir -p "$MONGO_DATA_DIR" "$(dirname "$MONGO_LOG")"
# 若未运行则启动（fork 到后台）
if ! pgrep -x mongod >/dev/null 2>&1; then
  log "启动 MongoDB..."
  mongod --dbpath "$MONGO_DATA_DIR" --logpath "$MONGO_LOG" --fork >/dev/null 2>&1
fi
wait_for "mongosh --quiet --eval 'db.runCommand({ping:1})' 2>/dev/null || mongo --quiet --eval 'db.runCommand({ping:1})'" 60 "MongoDB"

# ---------------- 3. Nginx ----------------
log "启动 Nginx..."
nginx -c /etc/nginx/nginx.conf

# ---------------- 4. Node 应用（PM2 托管，前台） ----------------
log "启动 EasyPicker 服务（PM2 托管 Node）..."
log "管理面板账号密码见容器日志（!!! 服务管理面板 !!!）"
cd /usr/share/easypicker/server
# pm2-runtime 作为前台主进程（经 tini 托管），Node 崩溃由 PM2 自动重启
exec pm2-runtime start ecosystem.config.cjs --no-daemon
