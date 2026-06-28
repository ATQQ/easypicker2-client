<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { updateTaskInfo } from '../../public'

const props = defineProps({
  k: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    default: '',
    required: false,
  },
})

const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generatePassword(len = 6) {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += PASSWORD_CHARS.charAt(Math.floor(Math.random() * PASSWORD_CHARS.length))
  }
  return s
}

const localPassword = ref(props.password || '')
watch(
  () => props.password,
  (v) => {
    localPassword.value = v || ''
  },
)

const enabled = computed({
  get: () => !!localPassword.value,
  set: (v: boolean) => {
    if (v) {
      const next = generatePassword()
      localPassword.value = next
      updateTaskInfo(props.k, { submitPassword: next })
    }
    else {
      localPassword.value = ''
      updateTaskInfo(props.k, { submitPassword: '' })
    }
  },
})

function handleRandom() {
  const next = generatePassword()
  localPassword.value = next
}

function handleSave() {
  const value = (localPassword.value || '').trim()
  if (value.length < 4) {
    ElMessage.warning('提交密码至少 4 位')
    return
  }
  if (value.length > 64) {
    ElMessage.warning('提交密码长度不能超过 64 位')
    return
  }
  updateTaskInfo(props.k, { submitPassword: value })
}

async function handleCopy() {
  if (!localPassword.value) {
    return
  }
  try {
    await navigator.clipboard.writeText(localPassword.value)
    ElMessage.success('已复制提交密码')
  }
  catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="config-panel password-panel">
    <div class="panel-tip">
      <div>
        <h4>提交密码</h4>
        <p>
          开启后，提交、撤回、查询是否已提交都需要输入该密码，可防止误提交。<br>
          开启时会自动生成一个随机密码，并在「复制分享信息」中追加该密码。
        </p>
      </div>
    </div>

    <div class="setting-card">
      <div class="setting-main">
        <div>
          <h5>启用提交密码</h5>
          <p>关闭后任意用户均可提交，开启时自动生成默认密码。</p>
        </div>
        <el-switch v-model="enabled" />
      </div>
    </div>

    <div v-show="enabled" class="setting-card">
      <div class="setting-main">
        <div>
          <h5>当前密码</h5>
          <p>至少 4 位；修改后请点击「保存」按钮生效。</p>
        </div>
      </div>
      <div class="setting-footer">
        <el-input
          v-model="localPassword"
          placeholder="请输入提交密码（至少 4 位）"
          maxlength="64"
          show-word-limit
          clearable
        />
        <div class="action-row">
          <el-button @click="handleRandom">
            随机生成
          </el-button>
          <el-button @click="handleCopy">
            复制
          </el-button>
          <el-button type="primary" @click="handleSave">
            保存
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.config-panel {
  display: grid;
  gap: 16px;
}

.panel-tip,
.setting-card {
  padding: 18px;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 14px;
}

.panel-tip {
  background: #f8fbff;

  h4 {
    margin: 0;
    font-size: 16px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    color: #909399;
    line-height: 1.6;
  }
}

.setting-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h5 {
    margin: 0;
    font-size: 15px;
    color: #303133;
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #909399;
  }
}

.setting-footer {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #edf2f7;
  display: grid;
  gap: 12px;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media screen and (max-width: 700px) {
  .setting-main {
    align-items: stretch;
    flex-direction: column;
  }

  .action-row {
    flex-wrap: wrap;
    justify-content: stretch;

    .el-button {
      flex: 1;
    }
  }
}
</style>
