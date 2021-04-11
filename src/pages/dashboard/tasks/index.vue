<template>
  <div class="tasks">
    <!-- 分类管理 -->
    <CategoryPanel v-model:category="selectCategory"></CategoryPanel>

    <!-- 任务管理 -->
    <div class="panel task-panel">
      <!-- 创建任务 -->
      <create-task :activeCategoryKey="selectCategory"></create-task>

      <!-- 任务列表 -->
      <div class="task-list">
        <task-info
          @edit="editBaseInfo"
          @delete="deleteTask"
          @share="shareTask"
          @more="editMore"
          v-for="item in filterTasks"
          :key="item.key"
          :item="item"
        ></task-info>
        <el-empty v-if="filterTasks.length === 0" description="此分类下没有任务哟"></el-empty>
      </div>
    </div>

    <!-- 任务基本信息维护弹窗 -->
    <el-dialog title="基本信息修改" v-model="showBaseInfoDialog">
      <el-form :model="taskBaseInfo">
        <el-form-item label="活动名称" label-width="100px">
          <el-input v-model="taskBaseInfo.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="新的分类" label-width="100px">
          <el-select v-model="taskBaseInfo.category" placeholder="请选择新分类">
            <el-option label="默认" value="default"></el-option>
            <el-option v-for="c in categorys" :key="c.k" :label="c.name" :value="c.k"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showBaseInfoDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSaveEditInfo">确 定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分享链接弹窗(二维码/链接/短链) -->
    <el-dialog title="收取链接" v-model="showLinkModal" center>
      <!-- 链接 -->
      <div>
        <el-input disabled placeholder="生成的链接" v-model="shareTaskLink">
          <template #prepend>
            <el-button type="primary" @click="createShortLink">生成短链</el-button>
          </template>
          <template #append>
            <el-button type="primary" @click="copyLink">复制</el-button>
          </template>
        </el-input>
      </div>
      <!-- 二维码 -->
      <div class="qr-code">
        <qr-code :value="shareTaskLink"></qr-code>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="showLinkModal = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 附加属性编辑弹窗 -->
    <el-dialog title="更多设置" v-model="showTaskInfoPanel" center>
      <div>
        <el-tabs v-model="activeInfo">
          <el-tab-pane label="截止日期" name="ddl">
            <div class="tc">
              <el-date-picker
                :editable="false"
                v-model="newDate"
                type="datetime"
                placeholder="点击设置新截止日期"
                @blur="updateDDL"
                :default-time="taskInfo.ddl"
              ></el-date-picker>
              <el-button @click="closeDDL">关闭</el-button>
            </div>
          </el-tab-pane>
          <el-tab-pane label="限制人员" name="people">
            <div class="tc">
              <el-button
                @click="uodateLimitPeople(true)"
                v-if="!taskInfo.people"
                size="medium"
                round
                type="success"
              >打开</el-button>
              <el-button
                @click="uodateLimitPeople(false)"
                v-if="taskInfo.people"
                size="medium"
                round
                type="danger"
              >关闭</el-button>
              <el-button
                @click="checkPeople"
                v-if="taskInfo.people"
                round
                size="medium"
                type="primary"
              >查看提交情况</el-button>
              <div class="upload-people" v-if="taskInfo.people">
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
                  :file-list="peopleFileList"
                >
                  <template #trigger>
                    <el-button size="small" type="primary">选取文件</el-button>
                  </template>
                  <el-button
                    @click="submitUploadPeople"
                    style="margin-left: 10px;"
                    size="small"
                    type="success"
                  >开始上传</el-button>
                  <template #tip>
                    <div class="el-upload__tip">只能上传 txt 文本文件,每行一个名字</div>
                  </template>
                </el-upload>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <!-- <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="showTaskInfoPanel = false">关闭</el-button>
        </span>
      </template>-->
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed, defineComponent, onMounted, reactive, ref,
} from 'vue'
import { useStore } from 'vuex'
import QrCode from '@components/QrCode.vue'
import { copyRes, getShortUrl } from '@/utils/stringUtil'
import { PeopleApi, TaskApi } from '@/apis'
import { tableToExcel, uploadFile } from '@/utils/networkUtil'
import CategoryPanel from './components/CategoryPanel.vue'
import CreateTask from './components/CreateTask.vue'
import TaskInfo from './components/TaskInfo.vue'

export default defineComponent({
  components: {
    CategoryPanel,
    CreateTask,
    TaskInfo,
    QrCode,
  },
  setup(_, context) {
    const $store = useStore()
    // 分类相关
    const categorys = computed(() => $store.state.category.categoryList)

    // 任务相关
    const selectCategory = ref('default')
    const tasks = computed<any[]>(() => $store.state.task.taskList)
    const filterTasks = computed(() => {
      const t = tasks.value.filter((v) => v.category === selectCategory.value)
      return t
    })

    // 删除任务
    const deleteTask = (k: string) => {
      if (!k) return
      ElMessageBox.confirm('确认删除此任务吗?', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
        .then(() => {
          $store.dispatch('task/deleteTask', k).then(() => {
            ElMessage.success('删除成功')
          })
        })
        .catch(() => {
          ElMessage.info('取消删除')
        })
    }

    // 基本信息编辑
    const showBaseInfoDialog = ref(false)
    const taskBaseInfo = reactive({ name: '', category: '', key: '' })
    const editBaseInfo = (task: any) => {
      taskBaseInfo.name = task.name
      taskBaseInfo.category = task.category
      taskBaseInfo.key = task.key
      showBaseInfoDialog.value = true
    }
    const handleSaveEditInfo = () => {
      showBaseInfoDialog.value = false
      $store.dispatch('task/updateTask', taskBaseInfo).then(() => {
        ElMessage.success('更新成功')
      })
    }

    // 生成分享链接
    const shareTaskLink = ref('')
    const showLinkModal = ref(false)
    const shareTask = (k: string) => {
      shareTaskLink.value = 'default'
      const { origin } = window.location
      shareTaskLink.value = `${origin}/task/${k}`
      showLinkModal.value = true
    }
    const createShortLink = () => {
      getShortUrl(shareTaskLink.value).then((v) => {
        shareTaskLink.value = v
        ElMessage.success('短链生成成功')
      })
    }
    const copyLink = () => {
      copyRes(shareTaskLink.value)
    }

    // 附加属性编辑
    const taskInfo = reactive<TaskInfo>({ people: 1 })
    const showTaskInfoPanel = ref(true)
    const activeInfo = ref('ddl')
    const activeTask: any = reactive({})
    // 日期控件选择的值
    const newDate = ref()
    const editMore = (item: any) => {
      Object.assign(activeTask, item)
      TaskApi.getTaskMoreInfo(item.key).then((res) => {
        newDate.value = null
        Object.assign(taskInfo, res.data)
        if (taskInfo.ddl) {
          newDate.value = new Date(taskInfo.ddl as string)
        }
        showTaskInfoPanel.value = true
      })
    }
    const updateTaskInfo = (options: any) => {
      if (activeTask?.key) {
        TaskApi
          .updateTaskMoreInfo(activeTask.key, options)
          .then(() => {
            ElMessage.success('设置成功')
          })
          .catch(() => {
            ElMessage.error('设置失败')
          })
      }
    }

    // 更新DDL
    const updateDDL = () => {
      if (newDate.value) {
        updateTaskInfo({ ddl: newDate.value })
      }
    }
    // 关闭DDL
    const closeDDL = () => {
      newDate.value = null
      updateTaskInfo({ ddl: null })
    }

    // 限制提交人员
    const uodateLimitPeople = (limit: boolean) => {
      updateTaskInfo({ people: +limit })
      taskInfo.people = +limit
    }
    // 查看提交情况
    const peopleFileList:any[] = reactive([])
    const checkPeople = () => {
      console.log(activeTask)
    }
    const peopleUpload = ref()
    // 超出选择的文件个数
    const handleExceedFile = () => {
      ElMessage.error('只能选择一个文件,可删除后重新选择')
    }
    // 清空文件
    const clearFiles = () => {
      peopleFileList.splice(0, peopleFileList.length)
      peopleUpload.value.clearFiles()
    }
    // 开始上传
    const submitUploadPeople = () => {
      peopleFileList.forEach((file) => {
        uploadFile(file.raw, '/api/public/upload', {
          success: (e:any) => {
            const { name, type } = e.data
            PeopleApi
              .importPeople(activeTask.key, name, type)
              .then((res) => {
                const { success, fail } = res.data
                ElMessage.success(`导入完成:${success}成功,${fail.length}失败`)
                if (fail.length > 0) {
                  setTimeout(() => {
                    ElMessage.info('自动开始下载未成功导入名单')
                    tableToExcel(['未成功导入名单'], fail.map((v:string) => ([v])), 'fail.xls')
                  }, 1000)
                }
                clearFiles()
              })
          },
        })
      })
    }

    // 添加文件
    const handleChangeFile = (file:any, fileList:any[]) => {
      if (file.raw.type !== 'text/plain') {
        ElMessage.warning('只支持txt文件')
        clearFiles()
        return
      }
      peopleFileList.push(file)
    }

    onMounted(() => {
      $store.dispatch('category/getCategory')
      $store.dispatch('task/getTask')
    })
    return {
      categorys,
      selectCategory,
      tasks,
      deleteTask,
      filterTasks,
      showBaseInfoDialog,
      taskBaseInfo,
      editBaseInfo,
      handleSaveEditInfo,
      shareTask,
      shareTaskLink,
      showLinkModal,
      createShortLink,
      copyLink,
      taskInfo,
      activeInfo,
      editMore,
      newDate,
      showTaskInfoPanel,
      updateDDL,
      closeDDL,
      uodateLimitPeople,
      peopleUpload,
      peopleFileList,
      checkPeople,
      handleExceedFile,
      clearFiles,
      handleChangeFile,
      submitUploadPeople,
    }
  },
})
</script>
<style scoped lang="scss">
.tasks {
  max-width: 1024px;
  margin: 0 auto;
  padding-bottom: 2em;
}

.panel {
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.task-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.qr-code {
  margin-top: 10px;
  text-align: center;
}
.upload-people {
  padding: 10px;
}
</style>
