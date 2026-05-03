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
  right: 28px;
  bottom: 28px;
  z-index: 99;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 54px;
  height: 54px;
  padding: 0 16px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 20%, rgb(255 255 255 / 42%), transparent 30%),
    linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  box-shadow: 0 14px 34px rgb(37 99 235 / 34%);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  text-decoration: none;
  transition:
    box-shadow 0.2s,
    transform 0.2s,
    filter 0.2s;

  &:hover {
    color: #fff;
    filter: brightness(1.04);
    box-shadow: 0 18px 42px rgb(37 99 235 / 42%);
    transform: translateY(-3px);
  }
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgb(255 255 255 / 18%);

  svg {
    width: 19px;
    height: 19px;
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
    right: 16px;
    bottom: 16px;
    width: 52px;
    min-width: 52px;
    height: 52px;
    padding: 0;
    justify-content: center;
  }

  .label {
    display: none;
  }
}
</style>
