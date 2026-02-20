import { Minus, Square, X } from 'lucide-react'

export default function WindowControls() {
  return (
    <div
      className="flex items-center h-full"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <button
        onClick={() => window.wsidn.window.minimize()}
        className="flex items-center justify-center w-11 h-full text-neutral-400 hover:bg-neutral-800 transition-colors"
      >
        <Minus size={12} />
      </button>
      <button
        onClick={() => window.wsidn.window.maximize()}
        className="flex items-center justify-center w-11 h-full text-neutral-400 hover:bg-neutral-800 transition-colors"
      >
        <Square size={10} />
      </button>
      <button
        onClick={() => window.wsidn.window.close()}
        className="flex items-center justify-center w-11 h-full text-neutral-400 hover:bg-red-600 hover:text-white transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  )
}
