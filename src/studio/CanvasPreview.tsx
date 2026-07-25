import { SlideRenderer } from '@/templates'
import { SLIDE_H, SLIDE_W } from '@/templates/geometry'
import { useBrandAssets } from '@/lib/brandAssets'
import type { Slide } from '@/lib/types'

// Preview fiel: renderiza o MESMO componente de src/templates dentro de um
// contêiner de 1080×1350 e aplica transform: scale(k) ao CONTÊINER (§4-A regra 4),
// nunca ao conteúdo.
export default function CanvasPreview({ slide, total, width = 432 }: { slide: Slide; total: number; width?: number }) {
  const assets = useBrandAssets()
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
          content={{ eyebrow: slide.eyebrow, title: slide.title, body: slide.body, citation: slide.citation }}
        />
      </div>
    </div>
  )
}
