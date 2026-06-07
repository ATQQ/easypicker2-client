#!/usr/bin/env bash
set -euo pipefail

# Kite postDeploy：安装依赖并按 PM2 是否已存在选择 start / restart。
# 可通过环境变量覆盖（与 kite postDeploy 中前缀一致），例如：
#   PM2_NAME=myapp SERVER_PORT=3001 bash scripts/kite/post-deploy-pm2.sh

PM2_NAME="${PM2_NAME:-demo2}"
SERVER_PORT="${SERVER_PORT:-3001}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${SERVER_ROOT}"

pnpm install --prod

export SERVER_PORT

if pm2 describe "${PM2_NAME}" >/dev/null 2>&1; then
  pm2 restart "${PM2_NAME}" --update-env
else
  pm2 start npm --name "${PM2_NAME}" --update-env -- run start
fi
