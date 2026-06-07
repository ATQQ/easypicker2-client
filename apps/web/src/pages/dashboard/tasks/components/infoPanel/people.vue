<script lang="ts" setup>
import type { UploadUserFile } from 'element-plus'
import type { PropType } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref, watch, watchEffect } from 'vue'
import { PeopleApi, TaskApi } from '@/apis'
import { useIsMobile } from '@/composables'
import { tableToExcel, uploadFile } from '@/utils/networkUtil'
import { formatDate, parseInfo } from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  value: {
    type: Number,
    defalut: 0,
  },
  k: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    default: '',
  },
  field: {
    type: String,
    default: '姓名',
  },
  /** 当前任务「必填信息」表单结构，用于绑定字段下拉选项 */
  info: {
    type: [String, Array] as PropType<string | InfoItem[]>,
    default: '',
  },
})

const activeTab = ref('手动添加')
const userInputName = ref('')
const importStatus = ref(false)
// 查看提交情况
const showPeopleList = ref(false)
function getInputPeopleNames() {
  const names: string[] = []
  const exists = new Set<string>()
  userInputName.value
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean)
    .forEach((name) => {
      if (exists.has(name))
        return
      exists.add(name)
      names.push(name)
    })
  return names
}

async function handAddName() {
  const names = getInputPeopleNames()
  if (names.length === 0) {
    ElMessage.warning('请输入姓名')
    return
  }
  importStatus.value = true
  try {
    const res = await PeopleApi.addPeopleByUser(names, props.k)
    const successNames = res.data?.success || []
    const failNames = res.data?.fail || []
    const successCount = successNames.length
    if (failNames.length === 0) {
      ElMessage.success(`添加成功 ${successCount} 人`)
      userInputName.value = ''
    }
    else if (successCount === 0) {
      ElMessage.error(`${failNames.length} 人添加失败，可能已存在`)
      userInputName.value = failNames.join('\n')
    }
    else {
      ElMessage.warning(`添加完成：${successCount} 人成功，${failNames.length} 人失败`)
      userInputName.value = failNames.join('\n')
    }
    if (showPeopleList.value && successCount > 0) {
      refreshSubmitData()
    }
  }
  catch {
    ElMessage.error('添加失败，请稍后重试')
    userInputName.value = names.join('\n')
  }
  finally {
    importStatus.value = false
  }
}
const checkMore = ref(false)

const people = ref(0)
watchEffect(() => {
  people.value = props.value as number
})
// 限制提交人员
function updateLimitPeople(limit: boolean) {
  updateTaskInfo(props.k, {
    people: +limit,
  })
  people.value = +limit
}

const peopleList: any = reactive([])
const selectSubmitStatus = ref('all')
const searchName = ref('')
const filterPeopleBySearchWord = computed(() => {
  if (!searchName.value) {
    return peopleList
  }
  return peopleList.filter(v => v.name.includes(searchName.value))
})
const peopleSubmitData = computed(() => {
  if (selectSubmitStatus.value === 'all') {
    return filterPeopleBySearchWord.value
  }
  return filterPeopleBySearchWord.value.filter(
    p => p.status === selectSubmitStatus.value,
  )
})
const isLoadingPeopleData = ref(false)
function refreshSubmitData() {
  isLoadingPeopleData.value = true
  PeopleApi.getPeople(props.k, `${+checkMore.value}`).then((res) => {
    peopleList.splice(0, peopleList.length)
    peopleList.push(...res.data.people)
    peopleList.forEach((p) => {
      if (!p.status && p.count === 0) {
        p.lastDate = '暂无记录'
      }
      else {
        p.lastDate = formatDate(new Date(p.lastDate), 'yyyy-MM-dd hh:mm:ss')
      }
    })
    isLoadingPeopleData.value = false
  })
}
function handleCheckMore() {
  checkMore.value = !checkMore.value
  if (checkMore.value) {
    refreshSubmitData()
  }
}
function checkPeople() {
  showPeopleList.value = true
  // 默认不展示提交数量
  checkMore.value = false
  refreshSubmitData()
}
function handleDeletePeople(item: any) {
  ElMessageBox.confirm('确认删除此人员吗', '数据无价，请谨慎操作')
    .then(() => {
      PeopleApi.deletePeople(props.k, item.id).then(() => {
        ElMessage.success('删除成功')
        peopleList.splice(
          peopleList.findIndex(v => v.id === item.id),
          1,
        )
      })
    })
    .catch(() => {
      ElMessage.info('取消删除')
    })
}
// 文件上传
const peopleFileList = ref<UploadUserFile[]>([])
const peopleUpload = ref()
// 超出选择的文件个数
function handleExceedFile() {
  ElMessage.error('只能选择一个文件,可删除后重新选择')
}
// 清空文件
function clearFiles() {
  peopleFileList.value.splice(0, peopleFileList.value.length)
  peopleUpload.value.clearFiles()
}
// 开始上传
function submitUploadPeople() {
  peopleFileList.value.forEach((file) => {
    uploadFile(
      file.raw,
      `${import.meta.env.VITE_APP_AXIOS_BASE_URL}public/upload`,
      {
        success: (e: any) => {
          const { name, type } = e?.data || {}
          if (!name) {
            ElMessage.error(e?.msg || '名单文件上传失败')
            return
          }
          PeopleApi.importPeople(props.k, name, type).then((res) => {
            const { success, fail } = res.data
            ElMessage.success(`导入完成:${success}成功,${fail.length}失败`)
            if (fail.length > 0) {
              setTimeout(() => {
                ElMessage.info('自动开始下载未成功导入名单')
                tableToExcel(
                  ['未成功导入名单'],
                  fail.map((v: string) => [v]),
                  `${props.name}_导入失败名单_${formatDate(
                    new Date(),
                    'yyyy年MM月dd日hh时mm分ss秒',
                  )}.xlsx`,
                )
              }, 1000)
            }
            clearFiles()
          })
        },
        error: (e: any) => {
          ElMessage.error(e?.msg || '名单文件上传失败')
        },
      },
    )
  })
}
// 添加文件
function handleChangeFile(file: any) {
  if (file.raw.type !== 'text/plain') {
    ElMessage.warning({
      message: '只支持txt文件',
      zIndex: 4000,
    })
    clearFiles()
  }
}
function handleExportExcel() {
  if (peopleSubmitData.value.length === 0) {
    ElMessage.warning('表格中没有可导出数据')
    return
  }
  const headers = [
    '姓名',
    '提交状态',
    '提交数量',
    '最后操作时间',
    ...(checkMore.value ? ['现存数量', '提交次数'] : []),
  ]
  const body = peopleSubmitData.value.map((v) => {
    const { name, status, lastDate, submitCount, fileCount, count } = v
    return [
      name,
      status ? '✔' : 'x',
      submitCount,
      status ? formatDate(new Date(lastDate)) : '',
      ...(checkMore.value ? [fileCount, count] : []),
    ]
  })
  tableToExcel(
    headers,
    body,
    `${props.name}_提交情况_${formatDate(
      new Date(),
      'yyyy年MM月dd日hh时mm分ss秒',
    )}.xlsx`,
  )
  ElMessage.success('导出成功')
}

const isMobile = useIsMobile()
const importPanelInfo = reactive({
  taskList: [],
  type: 'override',
  taskValue: '',
})
const showImportPanel = ref(false)
async function openImportPanel() {
  const taskKey = props.k
  // 通过任务Key获取可用任务列表，与概况信息
  const { data } = await PeopleApi.getUsefulTemplate(taskKey)
  importPanelInfo.taskList = data
  importPanelInfo.taskValue = data[0]?.taskKey || ''
  showImportPanel.value = true
}
const ImportTaskTipMsg = computed(() => {
  const { taskList, taskValue } = importPanelInfo
  const task = taskList.find(v => v.taskKey === taskValue)
  if (!task) {
    return '无可用任务'
  }
  return `${task.count} 条数据`
})
function handleSaveImportInfo() {
  PeopleApi.importPeopleFromTpl(
    props.k,
    importPanelInfo.taskValue,
    importPanelInfo.type,
  ).then((res) => {
    showImportPanel.value = false
    const { success, fail } = res.data
    ElMessage.success(`导入成功${success}条,失败${fail.length}条`)

    if (fail.length > 0) {
      setTimeout(() => {
        ElMessage.info('自动开始下载未成功导入名单')
        tableToExcel(
          ['未成功导入名单'],
          fail.map((v: string) => [v]),
          `${props.name}_导入失败名单_${formatDate(
            new Date(),
            'yyyy年MM月dd日hh时mm分ss秒',
          )}.xlsx`,
        )
      }, 1000)
    }
  })
}

const importPanelFlexStyle = computed(() => (isMobile.value ? '0 0 auto' : 0.5))

const bindField = ref('姓名')
watch(
  () => props.field,
  (v) => {
    bindField.value = v
  },
  {
    immediate: true,
  },
)

/** 从当前表单配置解析标题列表，供绑定字段下拉；无字段时保留默认「姓名」 */
const bindFieldTitleOptions = computed(() => {
  const titles = new Set<string>()
  const list = parseInfo(props.info as string | InfoItem[] | null | undefined)
  for (const item of list) {
    const t = item.text?.trim()
    if (t)
      titles.add(t)
  }
  if (!titles.size)
    titles.add('姓名')
  return [...titles]
})
function handleSureBind() {
  const name = bindField.value != null ? String(bindField.value).trim() : ''
  if (!name.length) {
    ElMessage.warning('绑定的表单项不能为空')
    return
  }

  // 提交保存
  TaskApi.updateTaskMoreInfo(props.k, {
    bindField: name,
  }).then(() => {
    ElMessage.success('保存成功')
  })
}
</script>

<template>
  <div class="config-panel info-panel">
    <section class="panel-tip">
      <div>
        <h4>限制名单</h4>
        <p>开启后，只有名单中的成员才可以提交文件，可通过文件、其它任务或手动方式维护名单。</p>
      </div>
      <Tip
        :imgs="[
          'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MzEwOTEzOQ==650183109139',
          'https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjY3MTUyMw==651496671523',
        ]"
      >
        查看示例
      </Tip>
    </section>

    <section class="setting-card">
      <div class="setting-header">
        <div>
          <h4>名单校验</h4>
          <p>{{ people ? '当前已开启名单限制。' : '当前未开启名单限制，所有用户都可以提交。' }}</p>
        </div>
        <div class="header-actions">
          <el-switch
            :model-value="Boolean(people)"
            active-text="开启"
            inactive-text="关闭"
            @change="v => updateLimitPeople(Boolean(v))"
          />
          <el-button v-if="people" type="primary" plain @click="checkPeople">
            查看提交情况
          </el-button>
        </div>
      </div>
    </section>

    <template v-if="people">
      <section class="setting-card">
        <div class="setting-header">
          <div>
            <h4>名单导入</h4>
            <p>推荐大量名单使用文件导入，少量人员可直接手动添加。</p>
          </div>
        </div>
        <el-radio-group v-model="activeTab" class="import-tabs">
          <el-radio-button label="文件导入" />
          <el-radio-button label="任务导入" />
          <el-radio-button label="手动添加" />
        </el-radio-group>

        <div class="import-people-wrapper">
          <div v-show="activeTab === '文件导入'" class="import-card">
            <el-upload
              ref="peopleUpload"
              v-model:file-list="peopleFileList"
              accept="text/plain"
              action=""
              class="upload-demo"
              :on-change="handleChangeFile"
              :on-exceed="handleExceedFile"
              :on-remove="clearFiles"
              :auto-upload="false"
              :limit="1"
            >
              <template #trigger>
                <el-button type="primary" plain>
                  选择文件
                </el-button>
              </template>
              <el-button
                class="upload-action"
                type="success"
                :disabled="!peopleFileList.length"
                @click="submitUploadPeople"
              >
                确定上传
              </el-button>
              <template #tip>
                <div class="el-upload__tip">
                  <Tip
                    :imgs="[
                      'https://img.cdn.sugarat.top/mdImg/MTY1MDE4Mjk2NjUxMA==650182966510',
                    ]"
                  >
                    只能上传 .txt 文本文件，每行一个名字
                  </Tip>
                  <Tip>如名字有特殊字符，建议去除</Tip>
                  <Tip>上传文件导入的方式，为追加导入，不会覆盖已存在数据</Tip>
                </div>
              </template>
            </el-upload>
          </div>
          <div v-show="activeTab === '任务导入'" class="import-card">
            <p>从已有任务中导入限制名单，可选择覆盖或追加。</p>
            <el-button type="success" @click="openImportPanel">
              选择任务
            </el-button>
          </div>
          <div v-show="activeTab === '手动添加'" class="import-card">
            <el-input
              v-model="userInputName"
              :disabled="importStatus"
              type="textarea"
              :autosize="{ minRows: 3, maxRows: 8 }"
              placeholder="每行一个姓名"
            />
            <div class="manual-add-actions">
              <el-button
                type="primary"
                :loading="importStatus"
                :disabled="!userInputName.trim()"
                @click="handAddName"
              >
                批量添加
              </el-button>
            </div>
            <p>会自动判重，不会重复添加。本次输入中的重复姓名会自动忽略。</p>
          </div>
        </div>
      </section>

      <section class="setting-card">
        <div class="setting-header">
          <div>
            <h4>绑定表单项</h4>
            <p>与必填信息中的字段同名时，可避免用户重复填写；选项来自当前表单标题，也可手动输入其它名称。</p>
          </div>
        </div>
        <el-form class="bind-form" label-width="100px">
          <el-form-item label="字段名称">
            <div class="bind-field-row">
              <el-select
                v-model="bindField"
                class="bind-field-select"
                filterable
                allow-create
                default-first-option
                clearable
                size="small"
                placeholder="选择表单标题或输入其它字段名"
              >
                <el-option
                  v-for="title in bindFieldTitleOptions"
                  :key="title"
                  :label="title"
                  :value="title"
                />
              </el-select>
              <el-button size="small" @click="handleSureBind">
                确定
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </section>
    </template>

    <el-dialog v-model="showPeopleList" :fullscreen="isMobile" title="提交情况">
      <!-- 上部分的筛选菜单 -->
      <div class="nav">
        <div class="item">
          <el-button
            :disabled="peopleList.length === 0"
            type="success"
            size="default"
            @click="handleExportExcel"
          >
            导出记录
          </el-button>
        </div>
        <div class="item">
          <el-select
            v-model="selectSubmitStatus"
            size="default"
            placeholder="状态筛选"
          >
            <el-option label="全部" value="all" />
            <el-option label="已提交" :value="1" />
            <el-option label="未提交" :value="0" />
          </el-select>
        </div>
        <div class="item">
          <el-input
            v-model="searchName"
            size="default"
            placeholder="输入要查询的姓名"
          />
        </div>
        <div class="item">
          <el-button type="primary" size="default" @click="handleCheckMore">
            {{ checkMore ? '隐藏' : '显示' }}详细提交情况
          </el-button>
        </div>
      </div>
      <!-- 概况信息 -->
      <div class="tc p10">
        <span>共: {{ peopleSubmitData.length }} 条数据</span>，
        <span>已提交: {{ peopleSubmitData.filter((v) => v.status).length }}</span>，
        <span>未提交: {{ peopleSubmitData.filter((v) => !v.status).length }}</span>
      </div>
      <div class="tc p10">
        <Tip>"提交次数" 用户实际的提交次数</Tip>
        <Tip>"现存数量" 还存在于服务器上的文件数 (不包含删除) --- 慢查询</Tip>
        <Tip>"提交数量" 用户实际提交的文件数 (不包含撤回) --- 慢查询</Tip>
      </div>
      <!-- 数据部分 -->
      <el-table
        v-loading="isLoadingPeopleData"
        element-loading-text="Loading..."
        stripe
        border
        :data="peopleSubmitData"
        height="460px"
      >
        <el-table-column label="序号" width="60">
          <template #default="scope">
            <div style="text-align: center">
              {{ scope.$index + 1 }}
            </div>
          </template>
        </el-table-column>
        <el-table-column property="name" label="姓名" />
        <el-table-column label="提交状态" width="100">
          <template #default="scope">
            <span v-if="scope.row.status" class="submit-ok">已提交</span>
            <span v-else class="submit-fail">未提交</span>
          </template>
        </el-table-column>
        <el-table-column
          property="count"
          label="提交次数"
          width="94"
        />
        <el-table-column
          sortable
          property="lastDate"
          label="最后操作时间"
          width="120"
        />
        <template v-if="checkMore">
          <el-table-column
            property="fileCount"
            label="现存数量"
            width="94"
          />
          <el-table-column
            sortable
            property="submitCount"
            label="提交数量"
            width="120"
          />
        </template>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button
              type="primary"
              text
              size="small"
              @click="handleDeletePeople(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <el-dialog
      v-model="showImportPanel"
      :fullscreen="isMobile"
      title="人员列表导入"
    >
      <el-form
        :model="importPanelInfo"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="任务">
          <el-select
            v-model="importPanelInfo.taskValue"
            filterable
            placeholder="请选择"
            no-data-text="无可用任务"
          >
            <el-option
              v-for="t in importPanelInfo.taskList"
              :key="t.taskKey"
              :label="t.name"
              :value="t.taskKey"
            />
          </el-select>
        </el-form-item>
        <Tip>{{ ImportTaskTipMsg }}</Tip>
        <el-form-item label="任务">
          <el-radio-group v-model="importPanelInfo.type">
            <el-radio label="override">
              覆盖导入
            </el-radio>
            <el-radio label="add">
              追加导入
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <Tip>
          {{
            importPanelInfo.type === 'override'
              ? '“覆盖导入” 将会覆盖原来的数据'
              : '“追加导入” 将只会导入不存在数据'
          }}
        </Tip>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportPanel = false">取 消</el-button>
          <el-button
            :disabled="!importPanelInfo.taskValue"
            type="primary"
            @click="handleSaveImportInfo"
          >确 定</el-button>
        </span>
      </template>
    </el-dialog>
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

.panel-tip,
.setting-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h4 {
    margin: 0;
    font-size: 16px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    font-size: 13px;
    color: #909399;
    line-height: 1.6;
  }
}

.panel-tip {
  background-color: #f8fbff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.import-tabs {
  margin-top: 16px;
}

.import-people-wrapper {
  margin-top: 16px;
}

.import-card {
  padding: 16px;
  background-color: #fafcff;
  border: 1px solid #edf2f7;
  border-radius: 12px;

  p {
    margin: 0 0 12px;
    font-size: 13px;
    color: #909399;
    line-height: 1.6;
  }
}

.upload-action {
  margin-left: 10px;
}

.manual-add-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.bind-form {
  max-width: 420px;
  margin-top: 16px;
}

.bind-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.bind-field-select {
  flex: 1;
  min-width: 0;
}

.submit-ok {
  color: #67c23a;
}

.submit-fail {
  color: #f56c6c;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  padding-bottom: 5px;
}

.nav .item {
  margin-left: 10px;
  margin-top: 5px;
}

.info-panel :deep(.el-form-item__label) {
  flex: v-bind(importPanelFlexStyle);
}

.info-panel :deep(.el-upload-list__item-name) {
  justify-content: flex-start;
}

@media screen and (max-width: 700px) {
  .panel-tip,
  .setting-header,
  .header-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .import-tabs {
    width: 100%;
    overflow-x: auto;
  }

  .upload-action {
    display: block;
    width: 100%;
    margin: 10px 0 0;
  }

  .manual-add-actions {
    justify-content: stretch;

    .el-button {
      width: 100%;
    }
  }
}
</style>
