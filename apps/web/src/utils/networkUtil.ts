type SuccessCallback = (data: any) => void
export function jsonp(
  url: string,
  jsonpCallback: string,
  success: SuccessCallback,
) {
  const $script = document.createElement('script')
  $script.src = `${url}&callback=${jsonpCallback}`
  $script.async = true
  $script.type = 'text/javascript'
  ;(<any>window)[jsonpCallback] = function callback(data: any) {
    if (success) {
      success(data)
    }
  }
  document.body.appendChild($script)
}

interface UploadFileOptions {
  success?: any
  error?: any
  process?: any
  method?: string
}

function parseUploadResponse(response: string) {
  if (!response)
    return undefined
  try {
    return JSON.parse(response)
  }
  catch {
    return undefined
  }
}

export function uploadFile(
  file: File,
  url: string,
  options?: UploadFileOptions,
) {
  const form = new FormData()
  // ajax对象
  const xhr = new XMLHttpRequest()
  // 添加文件到表单中
  form.append('file', file)
  // 设置请求方式 路径  是否异步
  xhr.open(options?.method || 'post', url, true)
  // 设置请求头参数的方式,如果没有可忽略此行代码
  xhr.setRequestHeader('token', localStorage.getItem('token') as string)
  if (options?.success) {
    // 上传完成
    xhr.onload = (e) => {
      const target = e?.currentTarget as any
      const data = parseUploadResponse(target.response)
      const success = target.status >= 200
        && target.status < 300
        && (data?.code === undefined || data.code === 0)
      if (!success) {
        options?.error?.(data || {
          code: target.status,
          msg: target.statusText || '上传失败',
        })
        return
      }
      options.success(data)
    }
  }
  if (options?.error) {
    // 上传出错
    xhr.onerror = options.error
  }
  if (options?.process) {
    // 上传中
    xhr.onprogress = (e) => {
      const { total, loaded, lengthComputable } = e
      if (lengthComputable) {
        options.process((loaded / total).toFixed(2))
      }
    }
  }

  // 发送请求
  xhr.send(form)
}

export interface tableItem {
  value: string
  col?: number
  row?: number
}

interface ExportCell {
  value: unknown
  colSpan: number
  rowSpan: number
}

interface SheetCell {
  value: string
  row: number
  col: number
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

let crcTable: number[] | undefined

function getCrcTable() {
  if (crcTable) {
    return crcTable
  }
  crcTable = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    }
    crcTable[i] = c >>> 0
  }
  return crcTable
}

function crc32(bytes: Uint8Array) {
  const table = getCrcTable()
  let crc = 0xFFFFFFFF
  for (let i = 0; i < bytes.length; i++) {
    crc = table[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function utf8Bytes(content: string) {
  return new TextEncoder().encode(content)
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true)
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true)
}

function concatBytes(chunks: Uint8Array[]) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const res = new Uint8Array(size)
  let offset = 0
  chunks.forEach((chunk) => {
    res.set(chunk, offset)
    offset += chunk.length
  })
  return res
}

function createZip(files: Array<{ name: string, content: string }>) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  files.forEach((file) => {
    const nameBytes = utf8Bytes(file.name)
    const data = utf8Bytes(file.content)
    const checksum = crc32(data)

    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    writeUint32(localView, 0, 0x04034B50)
    writeUint16(localView, 4, 20)
    writeUint16(localView, 6, 0x0800)
    writeUint16(localView, 8, 0)
    writeUint32(localView, 10, 0)
    writeUint32(localView, 14, checksum)
    writeUint32(localView, 18, data.length)
    writeUint32(localView, 22, data.length)
    writeUint16(localView, 26, nameBytes.length)
    local.set(nameBytes, 30)

    localParts.push(local, data)

    const central = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(central.buffer)
    writeUint32(centralView, 0, 0x02014B50)
    writeUint16(centralView, 4, 20)
    writeUint16(centralView, 6, 20)
    writeUint16(centralView, 8, 0x0800)
    writeUint16(centralView, 10, 0)
    writeUint32(centralView, 12, 0)
    writeUint32(centralView, 16, checksum)
    writeUint32(centralView, 20, data.length)
    writeUint32(centralView, 24, data.length)
    writeUint16(centralView, 28, nameBytes.length)
    writeUint32(centralView, 42, offset)
    central.set(nameBytes, 46)
    centralParts.push(central)

    offset += local.length + data.length
  })

  const centralDir = concatBytes(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  writeUint32(endView, 0, 0x06054B50)
  writeUint16(endView, 8, files.length)
  writeUint16(endView, 10, files.length)
  writeUint32(endView, 12, centralDir.length)
  writeUint32(endView, 16, offset)

  return concatBytes([...localParts, centralDir, end])
}

function escapeXml(value: string) {
  return stripInvalidXmlChars(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function stripInvalidXmlChars(value: string) {
  let result = ''
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code >= 0x20 || code === 0x09 || code === 0x0A || code === 0x0D) {
      result += value[i]
    }
  }
  return result
}

function isTableCell(value: unknown): value is tableItem {
  return (
    !!value
    && typeof value === 'object'
    && !(value instanceof Date)
    && ('value' in value || 'col' in value || 'row' in value)
  )
}

function normalizeExportCell(value: unknown): ExportCell {
  if (isTableCell(value)) {
    return {
      value: value.value,
      colSpan: Math.max(1, Number(value.col) || 1),
      rowSpan: Math.max(1, Number(value.row) || 1),
    }
  }
  return {
    value,
    colSpan: 1,
    rowSpan: 1,
  }
}

function stringifyCellValue(value: unknown) {
  if (value == null) {
    return ''
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toLocaleString()
  }
  return `${value}`
}

function encodeCellRef(rowIndex: number, colIndex: number) {
  let col = ''
  let n = colIndex + 1
  while (n > 0) {
    const mod = (n - 1) % 26
    col = String.fromCharCode(65 + mod) + col
    n = Math.floor((n - mod) / 26)
  }
  return `${col}${rowIndex + 1}`
}

function buildSheetData(headers: (string | tableItem)[], body: unknown[][]) {
  const sourceRows = [headers, ...body]
  const occupied = new Set<string>()
  const rows: SheetCell[][] = []
  const merges: string[] = []
  let maxCol = 0

  sourceRows.forEach((sourceRow, rowIndex) => {
    rows[rowIndex] = rows[rowIndex] || []
    let colIndex = 0

    sourceRow.forEach((sourceCell) => {
      while (occupied.has(`${rowIndex}:${colIndex}`)) {
        colIndex++
      }

      const cell = normalizeExportCell(sourceCell)
      const value = stringifyCellValue(cell.value)
      rows[rowIndex][colIndex] = {
        value,
        row: rowIndex,
        col: colIndex,
      }

      if (cell.colSpan > 1 || cell.rowSpan > 1) {
        const endRow = rowIndex + cell.rowSpan - 1
        const endCol = colIndex + cell.colSpan - 1
        merges.push(`${encodeCellRef(rowIndex, colIndex)}:${encodeCellRef(endRow, endCol)}`)

        for (let r = rowIndex; r <= endRow; r++) {
          for (let c = colIndex; c <= endCol; c++) {
            if (r !== rowIndex || c !== colIndex) {
              occupied.add(`${r}:${c}`)
            }
          }
        }
      }

      maxCol = Math.max(maxCol, colIndex + cell.colSpan)
      colIndex++
    })
  })

  return {
    rows,
    merges,
    maxCol,
  }
}

function createWorksheetXml(headers: (string | tableItem)[], body: unknown[][]) {
  const { rows, merges, maxCol } = buildSheetData(headers, body)
  const maxRow = Math.max(rows.length, 1)
  const dimension = `A1:${encodeCellRef(maxRow - 1, Math.max(maxCol - 1, 0))}`
  const rowXml = rows.map((row, rowIndex) => {
    const cells = row.filter(Boolean).map((cell) => {
      const value = escapeXml(cell.value)
      const preserveSpace = /^\s|\s$/.test(cell.value) ? ' xml:space="preserve"' : ''
      return `<c r="${encodeCellRef(rowIndex, cell.col)}" t="inlineStr"><is><t${preserveSpace}>${value}</t></is></c>`
    }).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${rowXml}</sheetData>
  ${mergeXml}
</worksheet>`
}

function createWorkbookBlob(headers: (string | tableItem)[], body: unknown[][]) {
  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: 'xl/styles.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`,
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: createWorksheetXml(headers, body),
    },
  ]

  return new Blob([createZip(files)], { type: XLSX_MIME })
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 导出表格数据为xlsx
 * @param headers 头部
 * @param body 身体部分数据
 */
export function tableToExcel(
  headers: (string | tableItem)[],
  body: any[],
  filename = 'res.xlsx',
) {
  const rows = Array.isArray(body)
    ? body.map(row => (Array.isArray(row) ? row : [row]))
    : []
  downloadBlob(createWorkbookBlob(headers, rows), filename)
}

export function localTaskFileUpload(
  file: File,
  meta: { taskKey: string, hash: string, name: string },
  options?: UploadFileOptions,
) {
  return localManagedFileUpload(file, '/file/upload', meta, options)
}

export function localManagedFileUpload(
  file: File,
  path: string,
  fields: Record<string, string | number>,
  options?: UploadFileOptions,
) {
  const rawBase = import.meta.env.VITE_APP_AXIOS_BASE_URL || '/api/'
  const base = rawBase.replace(/\/?$/, '')
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const xhr = new XMLHttpRequest()
  const form = new FormData()
  form.append('file', file)
  Object.entries(fields).forEach(([key, value]) => {
    form.append(key, String(value))
  })
  xhr.open('POST', url, true)
  const token = localStorage.getItem('token')
  if (token)
    xhr.setRequestHeader('token', token)

  const { success, error, process } = options || {}
  const subscription = {
    unsubscribe: () => {
      xhr.abort()
    },
  }

  xhr.upload.onprogress = (e) => {
    if (process && e.lengthComputable && e.total > 0) {
      const percent = ((e.loaded / e.total) * 100).toFixed(2)
      process(percent, e, subscription)
    }
  }

  xhr.onload = () => {
    try {
      const res = JSON.parse(xhr.responseText || '{}')
      if (xhr.status >= 200 && xhr.status < 300 && res.code === 0) {
        success?.(res.data, subscription)
      }
      else {
        error?.(new Error(res.msg || xhr.statusText || 'upload failed'), subscription)
      }
    }
    catch (e) {
      error?.(e, subscription)
    }
  }
  xhr.onerror = () => error?.(new Error('network'), subscription)
  xhr.send(form)
  return xhr
}

/**
 * 七牛云上传
 */
export function qiniuUpload(
  token: string,
  file: File,
  key: string,
  options?: UploadFileOptions,
) {
  const observable = qiniu.upload(file, key, token)
  const { success, error, process } = options || {}
  const subscription = observable.subscribe({
    next(res) {
      const {
        total: { percent },
      } = res
      if (process) {
        process(percent.toFixed(2), res, subscription)
      }
    },
    error(err) {
      if (error) {
        error(err, subscription)
      }
    },
    complete(res) {
      if (success) {
        success(res, subscription)
      }
    },
  })
  // subscription.close() // 取消上传
}

export function downLoadByUrl(url: string, filename = `${Date.now()}`) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.download = filename
  a.click()
}

/**
 * 解决图片被预览的问题
 * @param url
 * @param filename
 */
export function downLoadByXhr(
  url: string,
  filename = `${Date.now()}`,
  options?: {
    progress: (loaded: number, total: number) => void
    success: (res) => void
  },
) {
  const { progress, success } = options || {}
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url)
  // 设置返回数据的类型为blob
  xhr.responseType = 'blob'

  // 增加的代码
  xhr.onprogress = function (e) {
    const { total, loaded } = e
    if (typeof progress === 'function') {
      progress(loaded, total)
    }
  }

  // 资源完成下载
  xhr.onload = function () {
    let name = filename
    // 获取响应的blob对象
    const blob = xhr.response
    const a = document.createElement('a')
    // 设置下载的文件名字
    name = name || blob.name || 'download'
    a.download = name

    // 解决安全问题，新页面的window.opener 指向前一个页面的window对象
    // 使用noopener使 window.opener 获取的值为null
    a.rel = 'noopener'

    // 创建一个DOMString指向这个blob
    // 简单理解就是为这个blob对象生成一个可访问的链接
    a.href = URL.createObjectURL(blob)

    // 40s后移除这个临时链接
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
    }, 4e4) // 40s
    // 触发a标签，执行下载
    setTimeout(() => {
      a.dispatchEvent(new MouseEvent('click'))
      success(xhr)
    }, 0)
  }
  // 发送请求
  xhr.send()
}

export function mergeRequest<T extends (...args: any[]) => any>(callback: T, delay = 1000) {
  const pMap = new Map<string, Promise<any>>()
  const cb = ((...args: Parameters<T>) => {
    const key = JSON.stringify(args)
    let p = pMap.get(key)
    if (!p) {
      p = callback(...args)
      pMap.set(key, p)
      setTimeout(() => {
        pMap.delete(key)
      }, delay)
    }
    return p
  }) as T
  return cb as T
}
