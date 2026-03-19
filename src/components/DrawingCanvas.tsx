import { useRef, useEffect, useCallback, useState } from 'react'
import type { Stroke } from '../lib/types'
import { Toolbar } from './Toolbar'

interface DrawingCanvasProps {
  onSubmit: (strokes: Stroke[]) => void
  word: string
}

export function DrawingCanvas({ onSubmit, word }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(6)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const isDrawing = useRef(false)

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { width: 0, height: 0 }
    return { width: canvas.width, height: canvas.height }
  }, [])

  // Convert pixel coords to normalized 0-1 coords
  const normalize = useCallback((x: number, y: number) => {
    const { width, height } = getCanvasSize()
    return { x: x / width, y: y / height }
  }, [getCanvasSize])

  // Convert normalized coords back to pixels
  const denormalize = useCallback((x: number, y: number) => {
    const { width, height } = getCanvasSize()
    return { x: x * width, y: y * height }
  }, [getCanvasSize])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue
      ctx.beginPath()
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      const first = denormalize(stroke.points[0].x, stroke.points[0].y)
      ctx.moveTo(first.x, first.y)

      for (let i = 1; i < stroke.points.length; i++) {
        const pt = denormalize(stroke.points[i].x, stroke.points[i].y)
        ctx.lineTo(pt.x, pt.y)
      }
      ctx.stroke()
    }
  }, [strokes, currentStroke, denormalize])

  // Resize canvas to match container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      // After resize, adjust canvas size reference for drawing
      canvas.width = rect.width
      canvas.height = rect.height
      redraw()
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [redraw])

  useEffect(() => {
    redraw()
  }, [redraw])

  const getPosition = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0]
      return normalize(touch.clientX - rect.left, touch.clientY - rect.top)
    }
    return normalize(e.clientX - rect.left, e.clientY - rect.top)
  }

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    isDrawing.current = true
    const pos = getPosition(e)
    setCurrentStroke({
      points: [pos],
      color,
      width: brushSize,
      tool,
    })
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing.current || !currentStroke) return
    const pos = getPosition(e)
    setCurrentStroke(prev => prev ? {
      ...prev,
      points: [...prev.points, pos],
    } : null)
  }

  const stopDrawing = () => {
    if (!isDrawing.current || !currentStroke) return
    isDrawing.current = false
    if (currentStroke.points.length >= 2) {
      setStrokes(prev => [...prev, currentStroke])
    }
    setCurrentStroke(null)
  }

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    setStrokes([])
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Word display */}
      <div className="bg-slate-800 px-4 py-3 text-center border-b border-slate-700">
        <p className="text-sm text-slate-400">Draw this word:</p>
        <p className="text-xl font-bold text-white">{word}</p>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Toolbar */}
      <Toolbar
        color={color}
        brushSize={brushSize}
        tool={tool}
        onColorChange={setColor}
        onBrushSizeChange={setBrushSize}
        onToolChange={setTool}
        onUndo={handleUndo}
        onClear={handleClear}
        canUndo={strokes.length > 0}
      />

      {/* Submit button */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800">
        <button
          onClick={() => onSubmit(strokes)}
          disabled={strokes.length === 0}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
        >
          Send drawing
        </button>
      </div>
    </div>
  )
}
