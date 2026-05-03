import { spawn } from 'node:child_process'
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'

function run(command: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'ignore',
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} ${args.join(' ')} 执行失败，退出码：${code}`))
    })
  })
}

export async function extractTarball(tarball: string, outputDir: string) {
  await mkdir(outputDir, { recursive: true })
  await run('tar', ['-xzf', tarball, '-C', outputDir], process.cwd())
  return path.join(outputDir, 'package')
}

async function copyDir(source: string, target: string) {
  await mkdir(target, { recursive: true })

  const entries = await readdir(source, { withFileTypes: true })
  for (const entry of entries) {
    const from = path.join(source, entry.name)
    const to = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDir(from, to)
      continue
    }

    if (entry.isFile()) {
      await mkdir(path.dirname(to), { recursive: true })
      await copyFile(from, to)
    }
  }
}

async function exists(file: string) {
  try {
    await stat(file)
    return true
  }
  catch {
    return false
  }
}

export async function copyWebDist(packageDir: string, cwd: string) {
  const source = path.join(packageDir, 'dist')
  const target = path.join(cwd, 'dist')

  if (!await exists(source)) {
    throw new Error('资源包中不存在 dist 目录')
  }

  await rm(target, { recursive: true, force: true })
  await copyDir(source, target)

  return target
}

export async function copyServerFiles(packageDir: string, serverDir: string, overwriteEnv: boolean) {
  await mkdir(serverDir, { recursive: true })

  for (const name of ['dist', 'docs']) {
    const source = path.join(packageDir, name)
    if (await exists(source)) {
      await rm(path.join(serverDir, name), { recursive: true, force: true })
      await copyDir(source, path.join(serverDir, name))
    }
  }

  for (const name of ['package.json', 'README.md', 'LICENSE']) {
    const source = path.join(packageDir, name)
    if (await exists(source)) {
      await copyFile(source, path.join(serverDir, name))
    }
  }

  const envSource = path.join(packageDir, '.env')
  const envTarget = path.join(serverDir, '.env')
  if (await exists(envSource) && (overwriteEnv || !await exists(envTarget))) {
    await copyFile(envSource, envTarget)
  }

  return serverDir
}
