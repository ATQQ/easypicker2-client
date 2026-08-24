// PM2 应用配置（Docker 内托管 Node 后端）
// 设计目标：Node 崩溃时只重启 Node，不影响同容器的 MariaDB/MongoDB/Nginx
// 关键参数可通过环境变量覆盖，避免异常时无限重启
module.exports = {
  apps: [
    {
      name: 'ep-server',
      script: 'dist/index.js',
      cwd: '/usr/share/easypicker/server',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      // 崩溃保护：重启间隔 + 最大重启次数，超出则交由 Docker restart 策略兜底
      restart_delay: Number(process.env.EP_RESTART_DELAY) || 3000,
      max_restarts: Number(process.env.EP_MAX_RESTARTS) || 10,
      min_uptime: '10s',
      // 内存阈值重启（防内存泄漏），默认 1G
      max_memory_restart: process.env.EP_MAX_MEMORY_RESTART || '1G',
      // 日志直接走 stdout/stderr，便于 `docker logs` 查看，不在容器内落盘
      out_file: '/dev/stdout',
      error_file: '/dev/stderr',
      merge_logs: true,
      time: true,
    },
  ],
}
