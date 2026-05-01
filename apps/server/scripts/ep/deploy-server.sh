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
  # 更新代码
  git pull
  echo "✅ git repository"
fi

echo "使用分支 $branch 执行构建"

# 安装依赖
pnpm install
pnpm install

# 执行构建
pnpm server:build

# if [ ! -f ".env.local" ]; then
#   echo "❌  env.local"
#   cp .env .env.local
#   echo "请记得修改 easypicker2-client/apps/server 下的.env.local 文件内容，完善配置信息，然后执行下面指令启动服务"
#   else
#   echo "✅ .env.local"
# fi

echo "记得在 easypicker2-client/apps/server 目录下执行如下指令启动服务"
echo "cd easypicker2-client/apps/server"
echo "curl https://script.sugarat.top/shell/ep/run-server.sh | bash -s ep-server"
