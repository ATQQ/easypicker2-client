function isCmdExist() {
	local cmd="$1"
  	if [ -z "$cmd" ]; then
		echo "Usage isCmdExist yourCmd"
		return 1
	fi

	which "$cmd" >/dev/null 2>&1
	if [ $? -eq 0 ]; then
		return 0
	fi

	return 2
}

exist=0
notExist=2
folder="./.scripts"
file="init-env.mjs"

if [ ! -d "$folder" ]; then
  mkdir "$folder"
fi

# 拉zx脚本

# curl https://script.sugarat.top/zx/ep/$file > "./$folder/$file"

isCmdExist "zx"

if [ $? == $notExist ]
then
  echo "❌ zx"
  echo "安装zx"
  npm i -g zx --registry=https://registry.npmmirror.com
else
  echo "✅ zx"
fi

isCmdExist "node"

if [ $? == $notExist ]
then
  echo "❌ node"
  echo "请通过 pm2 安装 node 且版本大于>=14.19"
  exit 2
else
  echo "✅ node"
fi

isCmdExist "nrm"

if [ $? == $notExist ]
then
  echo "❌ nrm"
  echo "安装nrm"
  npm i -g nrm --registry=https://registry.npmmirror.com
else
  echo "✅ nrm"
fi

registry=$(npm get registry)

if [ $registry != "https://registry.npmmirror.com/" ]
then
  echo "❌ taobao registry"
  nrm use taobao
else
  echo "✅ taobao registry"
fi

isCmdExist "pnpm"

if [ $? == $notExist ]
then
  echo "❌ pnpm"
  echo "安装pnpm"
  npm i -g pnpm
else
  echo "✅ pnpm"
fi

# 执行zx脚本
# zx "$folder/$file"