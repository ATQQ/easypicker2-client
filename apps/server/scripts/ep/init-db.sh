dbName=$1
user=$2
pwd=$3
dir=$(pwd)
sqlFile="$dir/$dbName.sql"

curl https://script.sugarat.top/sql/ep/auto_create.sql > $sqlFile

mysql -u$user -p$pwd -e "show databases;use $dbName;source $sqlFile;show tables;"

echo "✅ 数据库表创建成功"

rm $sqlFile