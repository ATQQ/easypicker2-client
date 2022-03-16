# /bin/bash
compressDir="./dist" # 需要压缩目录 
compressFile="ep-dev-clinet.tar.gz"        # 压缩后的文件名
echo "开始-----归档解压"
tar -zvcf ${compressFile} ${compressDir}