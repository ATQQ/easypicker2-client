import { spawn } from 'node:child_process'
import { copyFile, lstat, mkdir, readdir, rm, stat } from 'node:fs/promises'
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

    let st
    try {
      st = await lstat(from)
    }
    catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as NodeJS.ErrnoException).code) : ''
      if (code === 'ENOENT')
        continue
      throw err
    }

    if (st.isDirectory()) {
      await copyDir(from, to)
      continue
    }

    if (st.isFile() || st.isSymbolicLink()) {
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

/**
 * 仅删除目标 dist 中与本次资源包 dist 顶层同名的路径（与 Vite 构建产物一致：如 index.html、assets、favicon 等），
 * 不动站点其余文件（如宝塔 .user.ini）。按 lstat 区分目录/文件，避免 ENOTDIR。
 */
async function removeTargetEntriesMatchingSourceDist(sourceDist: string, targetDist: string) {
  for (const name of await readdir(sourceDist)) {
    const full = path.join(targetDist, name)
    let st
    try {
      st = await lstat(full)
    }
    catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as NodeJS.ErrnoException).code) : ''
      if (code === 'ENOENT')
        continue
      throw err
    }
    if (st.isDirectory()) {
      await rm(full, { recursive: true, force: true })
    }
    else {
      await rm(full, { force: true })
    }
  }
}

export async function copyWebDist(packageDir: string, cwd: string) {
  const source = path.join(packageDir, 'dist')
  const target = path.join(cwd, 'dist')

  if (!await exists(source)) {
    throw new Error('资源包中不存在 dist 目录')
  }

  await mkdir(path.dirname(target), { recursive: true })
  await mkdir(target, { recursive: true })
  await removeTargetEntriesMatchingSourceDist(source, target)
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
