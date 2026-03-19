interface ToolbarProps {
  color: string
  brushSize: number
  tool: 'pen' | 'eraser'
  onColorChange: (color: string) => void
  onBrushSizeChange: (size: number) => void
  onToolChange: (tool: 'pen' | 'eraser') => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#78716c',
]

const SIZES = [3, 6, 12, 20]

export function Toolbar({
  color, brushSize, tool, onColorChange, onBrushSizeChange,
  onToolChange, onUndo, onClear, canUndo,
}: ToolbarProps) {
  return (
    <div className="bg-slate-800 border-t border-slate-700 px-3 py-2 space-y-2">
      {/* Colors */}
      <div className="flex items-center gap-1.5 justify-center">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => { onColorChange(c); onToolChange('pen') }}
            className={`w-8 h-8 rounded-full border-2 transition-transform ${
              color === c && tool === 'pen' ? 'border-indigo-400 scale-110' : 'border-slate-600'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Sizes + tools */}
      <div className="flex items-center justify-center gap-3">
        {SIZES.map(s => (
          <button
            key={s}
            onClick={() => onBrushSizeChange(s)}
            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
              brushSize === s ? 'bg-slate-600' : 'bg-slate-700 hover:bg-slate-600'
            }`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: Math.min(s, 20), height: Math.min(s, 20) }}
            />
          </button>
        ))}

        <div className="w-px h-6 bg-slate-600" />

        <button
          onClick={() => onToolChange(tool === 'eraser' ? 'pen' : 'eraser')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            tool === 'eraser' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Eraser
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30 transition-colors"
        >
          Undo
        </button>

        <button
          onClick={onClear}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
