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

isCmdExist "git"
if [ $? == $notExist ]
then
  echo "❌ git"
  echo "请自行安装git"
  exit 2
else
  echo "✅ git"
fi