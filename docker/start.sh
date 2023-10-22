nginx -c /etc/nginx/nginx.conf
redis-server /etc/redis/redis.conf
cd /usr/share/easypicker/server && pm2-runtime start pnpm --name ep-server -- run start