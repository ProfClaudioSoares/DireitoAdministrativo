import { useEffect, useState } from 'react'
import { SlideRenderer } from '@/templates'
import { SLIDE_H, SLIDE_W } from '@/templates/geometry'
import { useBrandAssets } from '@/lib/brandAssets'
import { supabase } from '@/lib/supabase'
import type { Slide } from '@/lib/types'

// Resolve a imagem do slide (bucket slide-images) para uma URL assinada de preview.
function useSlideImage(imagePath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!imagePath) {
      setUrl(null)
      return
    }
    supabase.storage
      .from('slide-images')
      .createSignedUrl(imagePath, 3600)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null)
      })
    return () => {
      alive = false
    }
  }, [imagePath])
  return url
}

// Preview fiel: renderiza o MESMO componente de src/templates dentro de um
// contêiner de 1080×1350 e aplica transform: scale(k) ao CONTÊINER (§4-A regra 4),
// nunca ao conteúdo.
export default function CanvasPreview({ slide, total, width = 432 }: { slide: Slide; total: number; width?: number }) {
  const assets = useBrandAssets()
  const image = useSlideImage(slide.image_url)
  const scale = width / SLIDE_W

  return (
    <div style={{ width, height: SLIDE_H * scale, overflow: 'hidden' }}>
      <div
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <SlideRenderer
          template={slide.template}
          index={slide.position}
          total={total}
          assets={assets}
          content={{ eyebrow: slide.eyebrow, title: slide.title, body: slide.body, citation: slide.citation, image }}
        />
      </div>
    </div>
  )
}
