FROM debian:latest

RUN touch /etc/apt/sources.list \
    && echo  "deb http://mirrors.aliyun.com/debian bullseye main" >/etc/apt/sources.list \
    && echo  "deb http://mirrors.aliyun.com/debian-security bullseye-security main" >>/etc/apt/sources.list \
    && echo  "deb http://mirrors.aliyun.com/debian bullseye-updates main" >>/etc/apt/sources.list \
    && mv /etc/apt/sources.list.d/debian.sources /etc/apt

# 安装curl
RUN apt update && apt install -y curl
# 安装pnpm
RUN curl -fsSL https://get.pnpm.io/install.sh | bash -

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 安装Node
RUN pnpm env use --global lts

# 安装nginx
RUN apt install -y nginx

# 安装redis
RUN apt install -y redis-server

COPY ./sources.list /etc/apt/sources.list

# 安装mysql
RUN apt update && apt install -y default-mysql-server default-mysql-client