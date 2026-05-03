import { Buffer } from 'node:buffer'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'

export interface PackageVersion {
  name: string
  version: string
  dist: {
    tarball: string
  }
}

interface RegistryInfo {
  'name': string
  'dist-tags': Record<string, string>
  'versions': Record<string, PackageVersion>
}

const packages = {
  web: '@sugarat/easypicker2-client',
  server: '@sugarat/easypicker2-server',
}

export type DeployTarget = keyof typeof packages

function request(url: string, redirects = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http
    const req = client.get(url, (res) => {
      const status = res.statusCode || 0
      const location = res.headers.location

      if (status >= 300 && status < 400 && location) {
        res.resume()
        if (redirects > 5) {
          reject(new Error(`请求重定向次数过多：${url}`))
          return
        }
        resolve(request(new URL(location, url).toString(), redirects + 1))
        return
      }

      if (status < 200 || status >= 300) {
        res.resume()
        reject(new Error(`请求失败：${status} ${url}`))
        return
      }

      const chunks: Buffer[] = []
      res.on('data', chunk => chunks.push(Buffer.from(chunk)))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })

    req.on('error', reject)
  })
}

function getRegistryUrl(registry: string, packageName: string) {
  const base = registry.replace(/\/$/, '')
  return `${base}/${packageName.replace('/', '%2f')}`
}

async function getPackageInfo(target: DeployTarget, registry: string) {
  const packageName = packages[target]
  const registryUrl = getRegistryUrl(registry, packageName)
  const data = JSON.parse((await request(registryUrl)).toString('utf-8')) as RegistryInfo

  return {
    packageName,
    data,
  }
}

function compareVersion(a: string, b: string) {
  const left = a.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  const right = b.split(/[.-]/).map(part => Number.parseInt(part, 10) || 0)
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] || 0) - (right[i] || 0)
    if (diff !== 0) {
      return diff
    }
  }
  return a.localeCompare(b)
}

export async function resolveVersion(options: {
  target: DeployTarget
  registry: string
  tag: string
  version?: string
}) {
  const { packageName, data } = await getPackageInfo(options.target, options.registry)
  const version = options.version || data['dist-tags'][options.tag]

  if (version && data.versions[version]) {
    return data.versions[version]
  }

  const versions = Object.values(data.versions)
    .filter(item => options.tag === 'latest' ? !item.version.includes('beta') : item.version.includes(options.tag))
    .sort((a, b) => compareVersion(b.version, a.version))

  const matched = versions[0]
  if (!matched) {
    throw new Error(`没有找到 ${packageName}@${options.version || options.tag}`)
  }

  return matched
}

export async function listVersions(options: {
  target: DeployTarget
  registry: string
  tag: string
}) {
  const { data } = await getPackageInfo(options.target, options.registry)

  return Object.values(data.versions)
    .filter(item => options.tag === 'latest' ? !item.version.includes('beta') : item.version.includes(options.tag))
    .sort((a, b) => compareVersion(b.version, a.version))
}

export async function downloadTarball(tarball: string, outputDir: string) {
  await mkdir(outputDir, { recursive: true })

  const file = path.join(outputDir, path.basename(new URL(tarball).pathname))
  const buffer = await request(tarball)

  await new Promise<void>((resolve, reject) => {
    const stream = createWriteStream(file)
    stream.on('finish', resolve)
    stream.on('error', reject)
    stream.end(buffer)
  })

  return file
}
