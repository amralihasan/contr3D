type ThumbnailCapturer = () => string | undefined

let activeCapturer: ThumbnailCapturer | null = null

export function registerThumbnailCapturer(capturer: ThumbnailCapturer | null): void {
  activeCapturer = capturer
}

export function captureSceneThumbnail(): string | undefined {
  try {
    return activeCapturer?.()
  } catch {
    return undefined
  }
}
