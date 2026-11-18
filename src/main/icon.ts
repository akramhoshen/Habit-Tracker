import { nativeImage, NativeImage } from 'electron'
import { renderLogoRGBA } from '../shared/logo'

/**
 * App icon (window, tray, notifications) — the Habit Tracker logo rendered at
 * runtime so the app ships with no image asset to manage. See shared/logo.ts.
 */
export function buildAppIcon(size = 64): NativeImage {
  const rgba = renderLogoRGBA(size)
  // Electron expects raw bitmaps as BGRA
  const bgra = Buffer.alloc(rgba.length)
  for (let i = 0; i < rgba.length; i += 4) {
    bgra[i] = rgba[i + 2]
    bgra[i + 1] = rgba[i + 1]
    bgra[i + 2] = rgba[i]
    bgra[i + 3] = rgba[i + 3]
  }
  return nativeImage.createFromBuffer(bgra, { width: size, height: size })
}
