import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { BrandAssets } from '@/templates/types'

// Para o PREVIEW no navegador podemos usar URLs assinadas remotas nos <img> —
// diferente do satori, que exige data URI. Os arquivos vivem no bucket `brand`.
const FILES = {
  monogramAmber: 'monogram-amber.png',
  monogramDark: 'monogram-dark.png',
  wordmark: 'wordmark.png',
}

const PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export function useBrandAssets(): BrandAssets {
  const [assets, setAssets] = useState<BrandAssets>({
    monogramAmber: PLACEHOLDER,
    monogramDark: PLACEHOLDER,
    wordmark: PLACEHOLDER,
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const entries = await Promise.all(
        (Object.entries(FILES) as [keyof BrandAssets, string][]).map(async ([key, file]) => {
          const { data } = await supabase.storage.from('brand').createSignedUrl(file, 3600)
          return [key, data?.signedUrl ?? PLACEHOLDER] as const
        }),
      )
      if (alive) setAssets(Object.fromEntries(entries) as unknown as BrandAssets)
    })()
    return () => {
      alive = false
    }
  }, [])

  return assets
}
