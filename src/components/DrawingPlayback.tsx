import { useRef, useEffect, useCallback, useState } from 'react'
import type { Stroke } from '../lib/types'

interface DrawingPlaybackProps {
  strokes: Stroke[]
  onAnimationComplete?: () => void
  slow?: boolean
}

export function DrawingPlayback({ strokes, onAnimationComplete, slow }: DrawingPlaybackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)
  const animRef = useRef<number | null>(null)
  const progressRef = useRef(0)

  // Store strokes and callback in refs so the animation effect doesn't restart
  // when realtime refetches give us a new array reference with the same data
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const onCompleteRef = useRef(onAnimationComplete)
  onCompleteRef.current = onAnimationComplete

  // Stable totalPoints — only recompute from the initial strokes
  const totalPointsRef = useRef(0)
  const [animKey] = useState(() => JSON.stringify(strokes.map(s => s.points.length)))
  useEffect(() => {
    totalPointsRef.current = strokes.reduce((sum, s) => sum + s.points.length, 0)
  }, [animKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const drawUpTo = useCallback((pointCount: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const currentStrokes = strokesRef.current

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    let remaining = pointCount
    for (const stroke of currentStrokes) {
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
  }, []) // stable — reads strokes from ref

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
      drawUpTo(progressRef.current)
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [drawUpTo])

  // Animate playback — only restarts when animKey changes (actual stroke data differs)
  useEffect(() => {
    const totalPoints = totalPointsRef.current
    if (totalPoints === 0) return
    progressRef.current = 0
    setDone(false)

    const DURATION_FRAMES = slow ? 900 : 600
    let frame = 0
    let called = false

    const animate = () => {
      frame++
      const t = Math.min(frame / DURATION_FRAMES, 1)
      const current = Math.round(t * totalPoints)
      progressRef.current = current
      drawUpTo(current)
      if (frame < DURATION_FRAMES) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setDone(true)
        if (!called) {
          called = true
          onCompleteRef.current?.()
        }
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [animKey, drawUpTo, slow]) // only restart when stroke data actually changes

  return (
    <div ref={containerRef} className="relative w-full aspect-square max-h-[60vh] bg-white rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
      />
      {!done && (
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {slow ? 'Slow drawing...' : 'Drawing...'}
        </div>
      )}
    </div>
  )
}
