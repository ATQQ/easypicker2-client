#!/usr/bin/env node
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function readArg(name, fallback) {
  const prefix = `${name}=`
  const inline = process.argv.find(arg => arg.startsWith(prefix))
  if (inline)
    return inline.slice(prefix.length)
  const idx = process.argv.indexOf(name)
  if (idx >= 0 && process.argv[idx + 1])
    return process.argv[idx + 1]
  return fallback
}

function hasArg(name) {
  return process.argv.includes(name)
}

function normalizeBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '')
}

function joinUrl(baseUrl, routePath) {
  return `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`
}

async function readChecks(checksFile) {
  const raw = await fs.readFile(checksFile, 'utf8')
  return JSON.parse(raw)
}

async function detectStorageMode(baseUrl, timeoutMs) {
  try {
    const resp = await sendRequest(joinUrl(baseUrl, '/api/config/global'), {
      method: 'GET',
      timeoutMs,
      headers: {
        'user-agent': 'easypicker-api-route-check',
        'x-api-check': '1',
      },
    })
    let json = null
    try {
      json = JSON.parse(resp.body || '{}')
    }
    catch {}
    return json?.data?.storageMode || json?.storageMode || 'unknown'
  }
  catch {
    return 'unknown'
  }
}

function buildBodyAndHeaders(check, headers) {
  if (check.multipart) {
    const boundary = `----easypicker-api-check-${Date.now()}`
    const chunks = []
    for (const [key, value] of Object.entries(check.multipart)) {
      if (key === 'file') {
        const file = value || {}
        chunks.push(Buffer.from(`--${boundary}\r\n`))
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"; filename="${file.name || 'api-check.txt'}"\r\n`))
        chunks.push(Buffer.from(`Content-Type: ${file.type || 'text/plain'}\r\n\r\n`))
        chunks.push(Buffer.from(file.content || 'api check'))
        chunks.push(Buffer.from('\r\n'))
      }
      else {
        chunks.push(Buffer.from(`--${boundary}\r\n`))
        chunks.push(Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`))
        chunks.push(Buffer.from(String(value ?? '')))
        chunks.push(Buffer.from('\r\n'))
      }
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`))
    const body = Buffer.concat(chunks)
    return {
      body,
      headers: {
        ...headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(body.length),
      },
    }
  }

  if (Object.hasOwn(check, 'body')) {
    const body = Buffer.from(JSON.stringify(check.body ?? {}))
    return {
      body,
      headers: {
        ...headers,
        'content-type': 'application/json',
        'content-length': String(body.length),
      },
    }
  }

  return { body: undefined, headers }
}

function sendRequest(url, options) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const client = parsedUrl.protocol === 'https:' ? https : http
    const req = client.request({
      method: options.method,
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      headers: options.headers,
    }, (res) => {
      const chunks = []
      res.on('data', chunk => chunks.push(Buffer.from(chunk)))
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      })
    })
    req.on('error', reject)
    req.setTimeout(options.timeoutMs, () => {
      req.destroy(new Error('timeout'))
    })
    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

async function requestCheck(baseUrl, check, options) {
  const headers = {
    'user-agent': 'easypicker-api-route-check',
    'x-api-check': '1',
  }
  if (options.useAuth && options.token && (check.method === 'GET' || options.includeSideEffects)) {
    headers.token = options.token
  }
  const bodyAndHeaders = buildBodyAndHeaders(check, headers)

  try {
    const startedAt = Date.now()
    const resp = await sendRequest(joinUrl(baseUrl, check.path), {
      method: check.method,
      headers: bodyAndHeaders.headers,
      body: bodyAndHeaders.body,
      timeoutMs: options.timeoutMs,
    })
    const duration = Date.now() - startedAt
    const routeMiss = resp.status === 404 || resp.status === 405
    const serverError = resp.status >= 500
    return {
      ok: !routeMiss && !serverError,
      status: resp.status,
      duration,
      reason: routeMiss
        ? 'route not reached'
        : serverError
          ? 'server error'
          : '',
      body: resp.body.slice(0, 180).replace(/\s+/g, ' ').trim(),
    }
  }
  catch (error) {
    return {
      ok: false,
      status: 'ERR',
      duration: 0,
      reason: error?.name === 'AbortError' ? 'timeout' : (error?.message || String(error)),
      body: '',
    }
  }
}

function formatResult(result) {
  if (result.skipped) {
    return `SKIP ${result.method.padEnd(6)} ${result.path} (${result.reason})`
  }
  const mark = result.ok ? 'PASS' : 'FAIL'
  const suffix = result.reason ? ` ${result.reason}` : ''
  return `${mark} ${String(result.status).padEnd(4)} ${String(result.duration).padStart(4)}ms ${result.method.padEnd(6)} ${result.path}${suffix}`
}

async function main() {
  const baseUrl = normalizeBaseUrl(readArg('--base-url', process.env.API_CHECK_BASE_URL || `http://127.0.0.1:${process.env.SERVER_PORT || 3001}`))
  const checksFile = readArg('--checks', path.join(__dirname, 'api-route-checks.json'))
  const timeoutMs = Number(readArg('--timeout', process.env.API_CHECK_TIMEOUT || 5000))
  const storageModeOverride = readArg('--storage-mode', process.env.API_CHECK_STORAGE_MODE || '')
  const includeSideEffects = hasArg('--include-side-effects')
  const useAuth = hasArg('--auth')
  const token = process.env.API_CHECK_TOKEN || ''
  const checks = await readChecks(checksFile)
  const storageMode = storageModeOverride || await detectStorageMode(baseUrl, timeoutMs)
  const results = []

  console.log(`API route check baseUrl=${baseUrl} storageMode=${storageMode} checks=${checks.length}`)
  if (token && !useAuth) {
    console.log('API_CHECK_TOKEN is set but not used. Pass --auth to include it in requests.')
  }

  for (const check of checks) {
    if (check.storageModes && !check.storageModes.includes(storageMode)) {
      results.push({
        ...check,
        skipped: true,
        reason: `storageMode=${storageMode}`,
      })
      continue
    }
    if (check.sideEffects && !includeSideEffects) {
      results.push({
        ...check,
        skipped: true,
        reason: 'side effects disabled',
      })
      continue
    }
    const result = await requestCheck(baseUrl, check, {
      timeoutMs,
      useAuth,
      token,
      includeSideEffects,
    })
    results.push({ ...check, ...result })
  }

  for (const result of results) {
    console.log(formatResult(result))
    if (!result.ok && !result.skipped && result.body) {
      console.log(`     ${result.body}`)
    }
  }

  const failed = results.filter(result => !result.skipped && !result.ok)
  const skipped = results.filter(result => result.skipped)
  const passed = results.length - failed.length - skipped.length
  console.log(`\nSummary: passed=${passed} failed=${failed.length} skipped=${skipped.length}`)
  if (failed.length) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
