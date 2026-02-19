import Tooltip from '@renderer/components/ui/Tooltip'

export default function WindowControls() {
  return (
    <div
      className="flex items-center h-full"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <Tooltip content="Minimize" side="bottom">
        <button
          onClick={() => window.wsidn.window.minimize()}
          className="flex items-center justify-center w-11 h-full text-neutral-400 hover:bg-neutral-800 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Maximize" side="bottom">
        <button
          onClick={() => window.wsidn.window.maximize()}
          className="flex items-center justify-center w-11 h-full text-neutral-400 hover:bg-neutral-800 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="4" width="16" height="16" rx="1" />
          </svg>
        </button>
      </Tooltip>
      <Tooltip content="Close" side="bottom">
        <button
          onClick={() => window.wsidn.window.close()}
          className="flex items-center justify-center w-11 h-full text-neutral-400 hover:bg-red-600 hover:text-white transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </Tooltip>
    </div>
  )
}
