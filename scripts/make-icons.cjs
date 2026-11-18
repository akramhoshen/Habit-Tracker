// Exports the logo (src/shared/logo.ts) to build/icon.ico + build/icon.png + resources/logo.png
// Usage: npm run icons
const { buildSync } = require('esbuild')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const os = require('os')

const root = path.resolve(__dirname, '..')
const tmp = path.join(os.tmpdir(), 'habit-logo-bundle.cjs')
buildSync({
  entryPoints: [path.join(root, 'src/shared/logo.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: tmp,
  logLevel: 'error'
})
const { renderLogoRGBA } = require(tmp)

function png(size) {
  const rgba = renderLogoRGBA(size)
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(zlib.crc32(td) >>> 0)
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function ico(sizes) {
  const images = sizes.map((s) => ({ s, data: png(s) }))
  const head = Buffer.alloc(6)
  head.writeUInt16LE(1, 2) // type: icon
  head.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const dir = images.map(({ s, data }) => {
    const e = Buffer.alloc(16)
    e[0] = s >= 256 ? 0 : s
    e[1] = s >= 256 ? 0 : s
    e.writeUInt16LE(1, 4) // planes
    e.writeUInt16LE(32, 6) // bpp
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([head, ...dir, ...images.map((i) => i.data)])
}

fs.mkdirSync(path.join(root, 'build'), { recursive: true })
fs.mkdirSync(path.join(root, 'resources'), { recursive: true })
fs.writeFileSync(path.join(root, 'build/icon.ico'), ico([16, 24, 32, 48, 64, 128, 256]))
fs.writeFileSync(path.join(root, 'build/icon.png'), png(512))
fs.writeFileSync(path.join(root, 'resources/logo.png'), png(512))
console.log('wrote build/icon.ico, build/icon.png, resources/logo.png')
