<template>
    <el-form label-width="100px">
        <el-form-item class="ellipsis" v-for="(
                info, idx
              ) in infos" :key="idx" :label="info.type === 'text' ? '固定内容' : info.text">

            <el-input v-if="renderInput(info.type)" :disabled="disabled || 'text'===info.type " :maxlength="
                maxInputLength
            " clearable show-word-limit :placeholder="info.type === 'text' ? info.text : `请输入${info.text}`"
                v-model="info.value"></el-input>
            <el-radio-group :disabled="disabled" v-if="info.type === 'radio'" v-model="info.value">
                <el-radio v-for="(r, idx) in info.children" :key="idx" :label="r.text">{{ r.text }}</el-radio>
            </el-radio-group>
        </el-form-item>
    </el-form>
</template>
<script setup lang="ts">
defineProps<{
    infos: InfoItem[]
    disabled: boolean
}>()

const maxInputLength = +import.meta.env
  .VITE_APP_INPUT_MAX_LENGTH || 10

const renderInput = (type: string) => ['text', 'input'].includes(type)

</script>
<style  scoped lang="scss">
</style>
