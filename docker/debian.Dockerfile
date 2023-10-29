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

# 安装mongodb
RUN echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list \
    && apt-get -y install gnupg \
    && curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor \
    && apt update && apt install -y mongodb-org \
    && mkdir -p /var/lib/mongo