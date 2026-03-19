import { useRef, useEffect, useCallback, useState } from 'react'
import type { Stroke } from '../lib/types'

interface DrawingPlaybackProps {
  strokes: Stroke[]
  onAnimationComplete?: () => void
}

export function DrawingPlayback({ strokes, onAnimationComplete }: DrawingPlaybackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const animRef = useRef<number | null>(null)
  const completeCalled = useRef(false)

  const totalPoints = strokes.reduce((sum, s) => sum + s.points.length, 0)

  const drawUpTo = useCallback((pointCount: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let remaining = pointCount
    for (const stroke of strokes) {
      if (remaining <= 0) break
      const pts = stroke.points.slice(0, remaining)
      remaining -= stroke.points.length

      if (pts.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height)
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height)
      }
      ctx.stroke()
    }
  }, [strokes])

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      drawUpTo(progress)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [drawUpTo, progress])

  // Animate playback - slower: ~8 seconds at 60fps
  useEffect(() => {
    if (totalPoints === 0) return
    setProgress(0)
    completeCalled.current = false

    const speed = Math.max(1, Math.ceil(totalPoints / 480))
    let current = 0

    const animate = () => {
      current = Math.min(current + speed, totalPoints)
      setProgress(current)
      drawUpTo(current)
      if (current < totalPoints) {
        animRef.current = requestAnimationFrame(animate)
      } else if (!completeCalled.current) {
        completeCalled.current = true
        onAnimationComplete?.()
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [totalPoints, drawUpTo, onAnimationComplete])

  return (
    <div ref={containerRef} className="relative w-full aspect-square max-h-[60vh] bg-white rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
      {progress < totalPoints && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          Drawing...
        </div>
      )}
    </div>
  )
}
