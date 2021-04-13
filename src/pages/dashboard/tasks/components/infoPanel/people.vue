<template>
  <div class="tc">
    <el-button @click="uodateLimitPeople(true)" v-if="!people" size="medium" round type="success">打开</el-button>
    <el-button @click="uodateLimitPeople(false)" v-if="people" size="medium" round type="danger">关闭</el-button>
    <el-button @click="checkPeople" v-if="people" round size="medium" type="primary">查看提交情况</el-button>
    <div class="upload-people" v-if="people">
      <el-upload
        accetp="text/plain"
        action
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
    <el-dialog title="提交情况" v-model="showPeopList">
      <el-table stripe border :data="peopleList" height="360px">
        <el-table-column sortable property="name" label="姓名" width="150"></el-table-column>
        <el-table-column label="提交状态" width="100">
          <template #default="scope">
            <el-button
              v-if="scope.row.status"
              type="success"
              size="mini"
              icon="el-icon-check"
              circle
            ></el-button>
            <el-button v-else type="danger" icon="el-icon-close" size="mini" circle></el-button>
          </template>
        </el-table-column>
        <!-- <el-table-column sortable property="count" label="提交次数" width="150"></el-table-column> -->
        <el-table-column sortable property="lastDate" label="最后提交时间" width="180"></el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button @click="handleDeletePeople(scope.row)" type="text" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { PeopleApi } from '@/apis'
import { uploadFile, tableToExcel } from '@/utils/networkUtil'
import { formatDate } from '@/utils/stringUtil'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  defineComponent, reactive, ref, watchEffect,
} from 'vue'
import { updateTaskInfo } from '../../public'

export default defineComponent({
  props: {
    value: {
      type: Number,
      defalut: 0,
    },
    k: {
      type: String,
      default: '',
    },
  },
  name: 'peoplePanel',
  setup(props) {
    const people = ref(0)
    watchEffect(() => {
      people.value = props.value as number
    })
    // 限制提交人员
    const uodateLimitPeople = (limit: boolean) => {
      updateTaskInfo(props.k, { people: +limit })
      people.value = +limit
    }
    // 查看提交情况
    const showPeopList = ref(false)
    const peopleList: any[] = reactive([])
    const checkPeople = () => {
      PeopleApi.getPeople(props.k).then((res) => {
        peopleList.splice(0, peopleList.length)
        peopleList.push(...res.data.people)
        peopleList.forEach((p) => {
          if (!p.status) {
            p.lastDate = '暂无记录'
          } else {
            p.lastDate = formatDate(new Date(p.lastDate), 'yyyy-MM-dd hh:mm:ss')
          }
        })
        showPeopList.value = true
      })
    }
    const handleDeletePeople = (item: any) => {
      ElMessageBox.confirm('确认删除此人员吗', '提示').then(() => {
        PeopleApi.deletePeople(props.k, item.id).then(() => {
          ElMessage.success('删除成功')
          peopleList.splice(peopleList.findIndex((v) => v.id === item.id), 1)
        })
      }).catch(() => {
        ElMessage.info('取消删除')
      })
    }

    // 文件上传
    const peopleFileList: any[] = reactive([])
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
          success: (e: any) => {
            const { name, type } = e.data
            PeopleApi
              .importPeople(props.k, name, type)
              .then((res) => {
                const { success, fail } = res.data
                ElMessage.success(`导入完成:${success}成功,${fail.length}失败`)
                if (fail.length > 0) {
                  setTimeout(() => {
                    ElMessage.info('自动开始下载未成功导入名单')
                    tableToExcel(['未成功导入名单'], fail.map((v: string) => ([v])), 'fail.xls')
                  }, 1000)
                }
                clearFiles()
              })
          },
        })
      })
    }

    // 添加文件
    const handleChangeFile = (file: any) => {
      if (file.raw.type !== 'text/plain') {
        ElMessage.warning('只支持txt文件')
        clearFiles()
        return
      }
      peopleFileList.push(file)
    }

    return {
      people,
      uodateLimitPeople,
      checkPeople,
      handleExceedFile,
      handleChangeFile,
      submitUploadPeople,
      clearFiles,
      peopleFileList,
      peopleUpload,
      showPeopList,
      peopleList,
      handleDeletePeople,
      formatDate,
    }
  },
})
</script>
<style scoped>
.upload-people {
  padding: 10px;
}
</style>
