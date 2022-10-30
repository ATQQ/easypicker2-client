<template>
  <div class="tc info-panel">
    <tip
      :imgs="[
        'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MzEwOTEzOQ==650183109139',
        'https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjY3MTUyMw==651496671523'
      ]"
      >只有名单里的成员，才可提交文件</tip
    >
    <el-button
      @click="updateLimitPeople(true)"
      v-if="!people"
      size="default"
      round
      type="success"
      >开启</el-button
    >
    <el-button
      @click="updateLimitPeople(false)"
      v-if="people"
      size="default"
      round
      type="danger"
      >关闭</el-button
    >
    <el-button
      @click="checkPeople"
      v-if="people"
      round
      size="default"
      type="primary"
      >查看提交情况</el-button
    >
    <div class="upload-people" v-if="people">
      <el-radio-group v-model="activeTab" size="small">
        <el-radio-button label="文件导入" />
        <el-radio-button label="任务导入" />
        <el-radio-button label="手动添加" />
      </el-radio-group>
      <div class="import-people-wrapper">
        <div v-show="activeTab === '文件导入'">
          <el-upload
            accetp="text/plain"
            action=""
            class="upload-demo"
            ref="peopleUpload"
            :on-change="handleChangeFile"
            :on-exceed="handleExceedFile"
            :on-remove="clearFiles"
            :auto-upload="false"
            :limit="1"
            v-model:file-list="peopleFileList"
          >
            <template #trigger>
              <el-button size="small" type="primary">选择文件</el-button>
            </template>
            <el-button
              @click="submitUploadPeople"
              style="margin-left: 10px"
              size="small"
              type="success"
              :disabled="!peopleFileList.length"
              >确定上传</el-button
            >
            <template #tip>
              <div class="el-upload__tip">
                <tip
                  :imgs="[
                    'https://img.cdn.sugarat.top/mdImg/MTY1MDE4Mjk2NjUxMA==650182966510'
                  ]"
                  >只能上传 .txt 文本文件，每行一个名字</tip
                >
                <tip>如名字有特殊字符，建议去除</tip>
                <tip>上传文件导入的方式，为追加导入，不会覆盖已存在数据</tip>
              </div>
            </template>
          </el-upload>
        </div>
        <div v-show="activeTab === '任务导入'">
          <!-- 从其它任务导入 -->
          <el-button size="small" type="success" @click="openImportPanel"
            >选择任务</el-button
          >
          <div class="p10">
            <tip>支持从已有的任务直接导入名单</tip>
          </div>
        </div>
        <div v-show="activeTab === '手动添加'">
          <div style="max-width: 300px; margin: 0 auto">
            <el-input
              :disabled="importStatus"
              v-model="userInputName"
              placeholder="请输入姓名"
            >
              <template #append>
                <el-button @click="handAddName"> 确定 </el-button>
              </template>
            </el-input>
          </div>
          <div class="p10">
            <tip>会自动判重，不会重复添加</tip>
            <tip>大量名单优先推荐使用文件导入</tip>
          </div>
        </div>
      </div>
    </div>
    <el-dialog :fullscreen="isMobile" title="提交情况" v-model="showPeopleList">
      <!-- 上部分的筛选菜单 -->
      <div class="nav">
        <div class="item">
          <el-button
            :disabled="peopleList.length === 0"
            type="success"
            size="default"
            @click="handleExportExcel"
            >导出记录</el-button
          >
        </div>
        <div class="item">
          <el-select
            size="default"
            v-model="selectSubmitStatus"
            placeholder="状态筛选"
          >
            <el-option label="全部" value="all" />
            <el-option label="已提交" :value="1" />
            <el-option label="未提交" :value="0" />
          </el-select>
        </div>
        <div class="item">
          <el-input
            size="default"
            placeholder="输入要查询的姓名"
            v-model="searchName"
          ></el-input>
        </div>
        <div class="item">
          <el-button type="primary" size="default" @click="handleCheckMore"
            >{{ checkMore ? '隐藏' : '显示' }}详细提交情况
          </el-button>
        </div>
      </div>
      <!-- 概况信息 -->
      <div class="tc p10">
        <span>共: {{ peopleSubmitData.length }} 条数据</span>，
        <span
          >已提交: {{ peopleSubmitData.filter((v) => v.status).length }}</span
        >，
        <span
          >未提交: {{ peopleSubmitData.filter((v) => !v.status).length }}</span
        >
      </div>
      <div class="tc p10">
        <tip>"提交次数" 用户实际的提交次数</tip>
        <tip>"现存数量" 还存在于服务器上的文件数 (不包含删除) --- 慢查询</tip>
        <tip>"提交数量" 用户实际提交的文件数 (不包含撤回) --- 慢查询</tip>
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
            <div style="text-align: center">{{ scope.$index + 1 }}</div>
          </template>
        </el-table-column>
        <el-table-column property="name" label="姓名"></el-table-column>
        <el-table-column label="提交状态" width="100">
          <template #default="scope">
            <span class="submit-ok" v-if="scope.row.status">已提交</span>
            <span class="submit-fail" v-else>未提交</span>
          </template>
        </el-table-column>
        <el-table-column
          property="count"
          label="提交次数"
          width="94"
        ></el-table-column>
        <el-table-column
          sortable
          property="lastDate"
          label="最后操作时间"
          width="120"
        ></el-table-column>
        <template v-if="checkMore">
          <el-table-column
            property="fileCount"
            label="现存数量"
            width="94"
          ></el-table-column>
          <el-table-column
            sortable
            property="submitCount"
            label="提交数量"
            width="120"
          ></el-table-column>
        </template>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button
              @click="handleDeletePeople(scope.row)"
              type="primary"
              text
              size="small"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
    <el-dialog
      :fullscreen="isMobile"
      title="人员列表导入"
      v-model="showImportPanel"
    >
      <el-form
        :model="importPanelInfo"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="任务">
          <el-select
            filterable
            v-model="importPanelInfo.taskValue"
            placeholder="请选择"
            no-data-text="无可用任务"
          >
            <el-option
              v-for="t in importPanelInfo.taskList"
              :key="t.taskKey"
              :label="t.name"
              :value="t.taskKey"
            >
            </el-option>
          </el-select>
        </el-form-item>
        <tip>{{ ImportTaskTipMsg }}</tip>
        <el-form-item label="任务">
          <el-radio-group v-model="importPanelInfo.type">
            <el-radio label="override">覆盖导入</el-radio>
            <el-radio label="add">追加导入</el-radio>
          </el-radio-group>
        </el-form-item>
        <tip>{{
          importPanelInfo.type === 'override'
            ? '“覆盖导入” 将会覆盖原来的数据'
            : '“追加导入” 将只会导入不存在数据'
        }}</tip>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showImportPanel = false">取 消</el-button>
          <el-button
            :disabled="!importPanelInfo.taskValue"
            type="primary"
            @click="handleSaveImportInfo"
            >确 定</el-button
          >
        </span>
      </template>
    </el-dialog>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage, ElMessageBox, UploadUserFile } from 'element-plus'
import { computed, defineComponent, reactive, ref, watchEffect } from 'vue'
import { useStore } from 'vuex'
import { PeopleApi } from '@/apis'
import { uploadFile, tableToExcel } from '@/utils/networkUtil'
import { formatDate } from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  value: {
    type: Number,
    defalut: 0
  },
  k: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  }
})

const activeTab = ref('手动添加')
const userInputName = ref('')
const importStatus = ref(false)

const handAddName = () => {
  if (!userInputName.value) {
    return
  }
  // TODO:掉接口导入
  importStatus.value = true
  PeopleApi.addPeopleByUser(userInputName.value, props.k)
    .then((v) => {
      ElMessage.success(`添加 ${userInputName.value} 成功`)
    })
    .catch(() => {
      ElMessage.error(`${userInputName.value} 已存在`)
    })
    .finally(() => {
      importStatus.value = false
      userInputName.value = ''
    })
}
const checkMore = ref(false)

const people = ref(0)
watchEffect(() => {
  people.value = props.value as number
})
// 限制提交人员
const updateLimitPeople = (limit: boolean) => {
  updateTaskInfo(props.k, {
    people: +limit
  })
  people.value = +limit
}

// 查看提交情况
const showPeopleList = ref(false)
const peopleList: any = reactive([])
const selectSubmitStatus = ref('all')
const searchName = ref('')
const filterPeopleBySearchWord = computed(() => {
  if (!searchName.value) {
    return peopleList
  }
  return peopleList.filter((v) => v.name.includes(searchName.value))
})
const peopleSubmitData = computed(() => {
  if (selectSubmitStatus.value === 'all') {
    return filterPeopleBySearchWord.value
  }
  return filterPeopleBySearchWord.value.filter(
    (p) => p.status === selectSubmitStatus.value
  )
})
const isLoadingPeopleData = ref(false)
const refreshSubmitData = () => {
  isLoadingPeopleData.value = true
  PeopleApi.getPeople(props.k, `${+checkMore.value}`).then((res) => {
    peopleList.splice(0, peopleList.length)
    peopleList.push(...res.data.people)
    peopleList.forEach((p) => {
      if (!p.status && p.count === 0) {
        p.lastDate = '暂无记录'
      } else {
        p.lastDate = formatDate(new Date(p.lastDate), 'yyyy-MM-dd hh:mm:ss')
      }
    })
    isLoadingPeopleData.value = false
  })
}
const handleCheckMore = () => {
  checkMore.value = !checkMore.value
  if (checkMore.value) {
    refreshSubmitData()
  }
}
const checkPeople = () => {
  showPeopleList.value = true
  // 默认不展示提交数量
  checkMore.value = false
  refreshSubmitData()
}
const handleDeletePeople = (item: any) => {
  ElMessageBox.confirm('确认删除此人员吗', '数据无价，请谨慎操作')
    .then(() => {
      PeopleApi.deletePeople(props.k, item.id).then(() => {
        ElMessage.success('删除成功')
        peopleList.splice(
          peopleList.findIndex((v) => v.id === item.id),
          1
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
const handleExceedFile = () => {
  ElMessage.error('只能选择一个文件,可删除后重新选择')
}
// 清空文件
const clearFiles = () => {
  peopleFileList.value.splice(0, peopleFileList.value.length)
  peopleUpload.value.clearFiles()
}
// 开始上传
const submitUploadPeople = () => {
  peopleFileList.value.forEach((file) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    uploadFile(
      file.raw,
      `${import.meta.env.VITE_APP_AXIOS_BASE_URL}public/upload`,
      {
        success: (e: any) => {
          const { name, type } = e.data
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
                    'yyyy年MM月日hh时mm分ss秒'
                  )}.xlsx`
                )
              }, 1000)
            }
            clearFiles()
          })
        }
      }
    )
  })
}
// 添加文件
const handleChangeFile = (file: any) => {
  if (file.raw.type !== 'text/plain') {
    ElMessage.warning({
      message: '只支持txt文件',
      zIndex: 4000
    })
    clearFiles()
  }
}
const handleExportExcel = () => {
  if (peopleSubmitData.value.length === 0) {
    ElMessage.warning('表格中没有可导出数据')
    return
  }
  const headers = [
    '姓名',
    '提交状态',
    '提交数量',
    '最后操作时间',
    ...(checkMore.value ? ['现存数量', '提交次数'] : [])
  ]
  const body = peopleSubmitData.value.map((v) => {
    const { name, status, lastDate, submitCount, fileCount, count } = v
    return [
      name,
      status ? '✔' : 'x',
      submitCount,
      status ? formatDate(new Date(lastDate)) : '',
      ...(checkMore.value ? [fileCount, count] : [])
    ]
  })
  tableToExcel(
    headers,
    body,
    `${props.name}_提交情况_${formatDate(
      new Date(),
      'yyyy年MM月日hh时mm分ss秒'
    )}.xlsx`
  )
  ElMessage.success('导出成功')
}
const $store = useStore()
const isMobile = computed(() => $store.getters['public/isMobile'])
const importPanelInfo = reactive({
  taskList: [],
  type: 'override',
  taskValue: ''
})
const showImportPanel = ref(false)
const openImportPanel = async () => {
  const taskKey = props.k
  // 通过任务Key获取可用任务列表，与概况信息
  const { data } = await PeopleApi.getUsefulTemplate(taskKey)
  importPanelInfo.taskList = data
  importPanelInfo.taskValue = data[0]?.taskKey || ''
  showImportPanel.value = true
}
const ImportTaskTipMsg = computed(() => {
  const { taskList, taskValue } = importPanelInfo
  const task = taskList.find((v) => v.taskKey === taskValue)
  if (!task) {
    return '无可用任务'
  }
  return `${task.count} 条数据`
})
const handleSaveImportInfo = () => {
  PeopleApi.importPeopleFromTpl(
    props.k,
    importPanelInfo.taskValue,
    importPanelInfo.type
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
            'yyyy年MM月日hh时mm分ss秒'
          )}.xlsx`
        )
      }, 1000)
    }
  })
}

const importPanelFlexStyle = computed(() => (isMobile.value ? '0 0 auto' : 0.5))
</script>
<style scoped>
.upload-people {
  padding: 10px;
}

.import-people-wrapper {
  padding: 10px 0;
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
  justify-content: center;
}
</style>
