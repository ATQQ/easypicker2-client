#!/usr/bin/env bash
# 将 mongodump 导出的 BSON 备份恢复到本地 MongoDB，目标库名默认为 ep-prod。
#
# 依赖: MongoDB Database Tools 中的 mongorestore
#   macOS: brew install mongodb-database-tools
#   文档: https://www.mongodb.com/docs/database-tools/mongorestore/
#
# 用法示例:
#   bash scripts/restore-ep-prod-mongo.sh ~/Downloads/ep-prod_bson_2026-05-02_10-00-32_mongodb_data
#   MONGO_URI='mongodb://127.0.0.1:27017' bash scripts/restore-ep-prod-mongo.sh ./backup --drop
#   bash scripts/restore-ep-prod-mongo.sh ./backup --source-db 线上原库名
#
# 环境变量:
#   MONGO_URI   默认 mongodb://127.0.0.1:27017（若需认证可写 mongodb://user:pwd@127.0.0.1:27017）
#   TARGET_DB   默认 ep-prod

set -euo pipefail

TARGET_DB="${TARGET_DB:-ep-prod}"
URI="${MONGO_URI:-mongodb://127.0.0.1:27017}"

usage() {
  echo "用法: $0 <备份路径> [--source-db <源库名>] [--drop]"
  echo "  <备份路径> 可为目录（mongodump 目录结构）或 .archive / .archive.gz 文件"
  echo "  --drop     导入前删除目标库中同名集合（慎用）"
  echo "  --source-db  备份里的 MongoDB 库名；若省略，脚本会尝试根据目录结构推断"
}

SOURCE_DB=""
USE_DROP=0
BACKUP_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source-db)
      SOURCE_DB="${2:-}"
      shift 2
      ;;
    --drop)
      USE_DROP=1
      shift
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "${BACKUP_PATH}" ]]; then
        BACKUP_PATH="$1"
      else
        echo "未知参数: $1" >&2
        usage >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "${BACKUP_PATH}" ]]; then
  usage >&2
  exit 1
fi
if [[ ! -e "${BACKUP_PATH}" ]]; then
  echo "路径不存在: ${BACKUP_PATH}" >&2
  exit 1
fi

if ! command -v mongorestore &>/dev/null; then
  echo "未找到 mongorestore，请先安装 MongoDB Database Tools。" >&2
  echo "macOS: brew install mongodb-database-tools" >&2
  echo "下载: https://www.mongodb.com/try/download/database-tools" >&2
  exit 1
fi

echo ">>> Mongo URI: ${URI}"
echo ">>> 目标数据库: ${TARGET_DB}"
echo ">>> 备份路径: ${BACKUP_PATH}"

run_restore() {
  if [[ "${USE_DROP}" -eq 1 ]]; then
    mongorestore --uri="${URI}" --drop "$@"
  else
    mongorestore --uri="${URI}" "$@"
  fi
}

# --- mongodump --archive 单文件 ---
case "${BACKUP_PATH}" in
  *.archive.gz)
    if [[ -n "${SOURCE_DB}" ]]; then
      run_restore --gzip --archive="${BACKUP_PATH}" --nsFrom="${SOURCE_DB}.*" --nsTo="${TARGET_DB}.*"
    else
      echo ">>> 使用 gzip 归档恢复（保持归档内原有库名）。若要导入到 ${TARGET_DB}，请追加: --source-db <原库名>" >&2
      run_restore --gzip --archive="${BACKUP_PATH}"
    fi
    exit 0
    ;;
  *.archive)
    if [[ -n "${SOURCE_DB}" ]]; then
      run_restore --archive="${BACKUP_PATH}" --nsFrom="${SOURCE_DB}.*" --nsTo="${TARGET_DB}.*"
    else
      echo ">>> 使用归档恢复（保持归档内原有库名）。若要导入到 ${TARGET_DB}，请追加: --source-db <原库名>" >&2
      run_restore --archive="${BACKUP_PATH}"
    fi
    exit 0
    ;;
esac

# --- 目录：顶层即有 *.bson（mongodump --db xxx --out 到单独文件夹时常见此结构）---
shopt -s nullglob
bson_top=( "${BACKUP_PATH}"/*.bson )
if [[ ${#bson_top[@]} -gt 0 ]]; then
  echo ">>> 检测到 BSON 在目录顶层，写入库 ${TARGET_DB}"
  run_restore --db="${TARGET_DB}" "${BACKUP_PATH}"
  exit 0
fi

# --- 目录：仅一个子目录，且内含 *.bson（常见: 备份根目录/实际库名/*.bson）---
shopt -s nullglob
single_child=""
child_count=0
for d in "${BACKUP_PATH}"/*/; do
  [[ -d "${d}" ]] || continue
  child_count=$((child_count + 1))
  single_child="${d}"
done

if [[ "${child_count}" -eq 1 ]]; then
  shopt -s nullglob
  inner=( "${single_child}"*.bson )
  if [[ ${#inner[@]} -gt 0 ]]; then
    detected=$(basename "${single_child}")
    detected="${detected%/}"
    use_source="${SOURCE_DB:-$detected}"
    echo ">>> 检测到单子目录「${detected}」，将 ${use_source}.* -> ${TARGET_DB}.*"
    run_restore --nsFrom="${use_source}.*" --nsTo="${TARGET_DB}.*" "${BACKUP_PATH}"
    exit 0
  fi
fi

# --- 显式源库名 ---
if [[ -n "${SOURCE_DB}" ]]; then
  echo ">>> 使用 --source-db ${SOURCE_DB}.* -> ${TARGET_DB}.*"
  run_restore --nsFrom="${SOURCE_DB}.*" --nsTo="${TARGET_DB}.*" "${BACKUP_PATH}"
  exit 0
fi

echo "" >&2
echo "无法自动识别备份目录结构，请指定线上 MongoDB 库名，例如:" >&2
echo "  $0 \"${BACKUP_PATH}\" --source-db <库名>" >&2
echo "" >&2
echo "可先查看备份目录内容: ls -la \"${BACKUP_PATH}\"" >&2
exit 1
