import { useRef, useEffect, useCallback, useState } from 'react'
import type { Stroke, SabotageType } from '../lib/types'
import { SABOTAGE_LABELS } from '../lib/types'
import { Toolbar } from './Toolbar'

interface DrawingCanvasProps {
  onSubmit: (strokes: Stroke[]) => void
  word: string
  sabotage?: SabotageType | null
}

const MIN_THICK_BRUSH = 30

export function DrawingCanvas({ onSubmit, word, sabotage }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [color, setColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(sabotage === 'thick_brush' ? MIN_THICK_BRUSH : 6)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const isDrawing = useRef(false)

  // Speed round timer
  const [timeLeft, setTimeLeft] = useState(sabotage === 'speed_round' ? 15 : null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (sabotage !== 'speed_round') return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          // Auto-submit
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [sabotage])

  // Auto-submit when speed round runs out
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  useEffect(() => {
    if (timeLeft === 0 && sabotage === 'speed_round') {
      onSubmit(strokesRef.current)
    }
  }, [timeLeft, sabotage, onSubmit])

  const getCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { width: 0, height: 0 }
    return { width: canvas.width, height: canvas.height }
  }, [])

  const normalize = useCallback((x: number, y: number) => {
    const { width, height } = getCanvasSize()
    // Mirror mode: flip x coordinate
    const nx = sabotage === 'mirror' ? 1 - (x / width) : x / width
    return { x: nx, y: y / height }
  }, [getCanvasSize, sabotage])

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

  const getEffectiveBrushSize = () => {
    if (sabotage === 'thick_brush') return Math.max(brushSize, MIN_THICK_BRUSH)
    return brushSize
  }

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    if (timeLeft === 0) return
    isDrawing.current = true
    const pos = getPosition(e)
    const effectiveColor = sabotage === 'no_colour' ? '#000000' : color
    setCurrentStroke({
      points: [pos],
      color: effectiveColor,
      width: getEffectiveBrushSize(),
      tool: sabotage === 'no_eraser' ? 'pen' : tool,
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
    if (sabotage === 'no_eraser') return
    setStrokes(prev => prev.slice(0, -1))
  }

  const handleClear = () => {
    if (sabotage === 'no_eraser') return
    setStrokes([])
  }

  const handleColorChange = (c: string) => {
    if (sabotage === 'no_colour') return
    setColor(c)
  }

  const handleToolChange = (t: 'pen' | 'eraser') => {
    if (sabotage === 'no_eraser' && t === 'eraser') return
    setTool(t)
  }

  const handleBrushSizeChange = (s: number) => {
    if (sabotage === 'thick_brush') {
      setBrushSize(Math.max(s, MIN_THICK_BRUSH))
    } else {
      setBrushSize(s)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Word display + sabotage banner */}
      <div className="bg-slate-800 px-4 py-3 text-center border-b border-slate-700">
        {sabotage && (
          <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
            {SABOTAGE_LABELS[sabotage]}
          </p>
        )}
        <p className="text-sm text-slate-400">Draw this word:</p>
        <div className="flex items-center justify-center gap-3">
          <p className="text-xl font-bold text-white">{word}</p>
          {sabotage === 'speed_round' && timeLeft !== null && (
            <span className={`text-lg font-mono font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-yellow-400'}`}>
              {timeLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 cursor-crosshair ${sabotage === 'mirror' ? '[transform:scaleX(-1)]' : ''}`}
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
        color={sabotage === 'no_colour' ? '#000000' : color}
        brushSize={getEffectiveBrushSize()}
        tool={sabotage === 'no_eraser' ? 'pen' : tool}
        onColorChange={handleColorChange}
        onBrushSizeChange={handleBrushSizeChange}
        onToolChange={handleToolChange}
        onUndo={handleUndo}
        onClear={handleClear}
        canUndo={sabotage === 'no_eraser' ? false : strokes.length > 0}
        disableColors={sabotage === 'no_colour'}
        disableEraser={sabotage === 'no_eraser'}
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
