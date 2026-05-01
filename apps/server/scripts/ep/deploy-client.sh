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
repository="https://github.com/ATQQ/easypicker2-client.git"
branch="main"
mode="production"
if [[ "$2" != "" ]]
then
    branch="$2"
fi
if [ $1 == "gitee" ]
then
    echo "use gitee repository"
    repository="https://gitee.com/sugarjl/easypicker2-client.git"
else
    echo "use github repository"
fi

if [[ "$3" != "" ]]
then
    mode="$3"
fi

isCmdExist "git"
if [ $? == $notExist ]
then
  echo "❌ git"
  echo "请自行安装git"
  exit 2
else
  echo "✅ git"
fi

# 拉最新仓库代码
if [ ! -d "easypicker2-client/.git" ]; then
  echo "❌ git repository"
  git clone $repository
  cd easypicker2-client
  git checkout "$branch"
  else
  cd easypicker2-client
  # 切分支
  git fetch && git checkout "$branch"
  git pull
  echo "✅ git repository"
fi

echo "使用分支 $branch 执行构建"

# 安装依赖
pnpm install
pnpm install

echo "🔧 use mode: $mode"

# 执行构建
pnpm build -- --mode "$mode"

clientPkgName="client.tar.gz"

# 压缩产物
tar -zvcf $clientPkgName -C apps/web dist

# 拷贝产物
tar -xf $clientPkgName -C "../"

echo "✅ 部署完成 🎉🎉🎉"