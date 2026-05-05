<script lang="ts" setup>
defineProps<{
  href: string
  text?: string
}>()
</script>

<template>
  <a
    class="floating-contact"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="text || '联系客服'"
    :title="text || '联系客服'"
  >
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path
          d="M12 3.5a7.5 7.5 0 0 0-7.5 7.5v3.25A2.75 2.75 0 0 0 7.25 17H8a1 1 0 0 0 1-1v-4.5a1 1 0 0 0-1-1H6.5A5.5 5.5 0 0 1 17.5 10.5H16a1 1 0 0 0-1 1V16a1 1 0 0 0 1 1h1.5v.25A1.75 1.75 0 0 1 15.75 19H13.7a2 2 0 0 0-1.7-1h-1a2 2 0 1 0 0 4h1a2 2 0 0 0 1.73-1h2.02a3.75 3.75 0 0 0 3.75-3.75V11A7.5 7.5 0 0 0 12 3.5Z"
        />
      </svg>
    </span>
    <span class="label">{{ text || '联系客服' }}</span>
  </a>
</template>

<style scoped lang="scss">
.floating-contact {
  position: fixed;
  right: 18px;
  bottom: 34px;
  z-index: 900;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  color: var(--el-color-primary);
  font-size: 14px;
  line-height: 1;
  text-decoration: none;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-color-primary-light-7);
  border-radius: 999px;
  box-shadow: var(--el-box-shadow-light);
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    box-shadow: var(--el-box-shadow);
    transform: translateY(-1px);
  }
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 16px;
    height: 16px;
    fill: currentcolor;
  }
}

.label {
  max-width: 90px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@media screen and (max-width: 700px) {
  .floating-contact {
    right: 12px;
    bottom: 22px;
    width: 42px;
    height: 42px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }

  .icon svg {
    width: 18px;
    height: 18px;
  }

  .label {
    display: none;
  }
}
</style>
