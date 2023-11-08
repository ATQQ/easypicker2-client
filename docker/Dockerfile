FROM sugarjl/debian:latest
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# 拷贝ep资源
COPY ./client /root/client
COPY ./server /root/server
COPY ./start.sh /start.sh
COPY ./nginx.conf /etc/nginx/sites-enabled/default
COPY ./mysql.cnf /etc/mysql/conf.d
COPY ./auto_create.sql /easypicker2.sql

# 环境准备
RUN mkdir -p /usr/share/easypicker/ng-logs \
    && mv /root/client /usr/share/easypicker \
    && mv /root/server /usr/share/easypicker \
    && pnpm config set registry https://registry.npmmirror.com/ \
    && cd /usr/share/easypicker/server && pnpm install -P \
    && pnpm add pm2 -g

EXPOSE 80

CMD ["bash", "./start.sh"]