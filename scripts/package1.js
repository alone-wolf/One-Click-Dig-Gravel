import {
  existsSync,
  mkdirSync,
  createWriteStream,
  readFileSync,
  readdirSync
} from 'fs'
import path from 'path'
import archiver from 'archiver'

// 读取 package.json
const pkgPath = path.resolve(process.cwd(), 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

const pkgName = pkg.name || 'minecraft-addon'
const pkgVersion = pkg.version || '0.0.0'

// 处理 @scope/name
const safeName = pkgName
  .replace(/^@/, '')
  .replace(/\//g, '-')

// 目录
const dist = './dist'
const pack = './pack'

if (!existsSync(dist)) mkdirSync(dist)
if (!existsSync(pack)) mkdirSync(pack)

// 计算 index（从 00 开始）
const baseName = `${safeName}-${pkgVersion}`
const existingFiles = readdirSync(pack)

let maxIndex = -1
for (const file of existingFiles) {
  const match = file.match(
    new RegExp(`^${baseName}-(\\d{2})\\.mcaddon$`)
  )
  if (match) {
    const idx = Number(match[1])
    if (idx > maxIndex) maxIndex = idx
  }
}

const nextIndex = String(maxIndex + 1).padStart(2, '0')

// 输出文件
const outputZipFile = `${pack}/${baseName}-${nextIndex}.mcaddon`

const output = createWriteStream(outputZipFile)
const archive = archiver('zip', { zlib: { level: 9 } })

const distB = 'dist/behavior_pack'
const distR = 'dist/resource_pack'

if (existsSync(distB)) archive.directory(distB, 'behavior_pack')
if (existsSync(distR)) archive.directory(distR, 'resource_pack')

archive.pipe(output)
archive.finalize()

console.log(`Addon packed as: ${outputZipFile}`)
