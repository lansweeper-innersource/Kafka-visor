import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

type ScannerVariant = 'onprem' | 'vnext'

const VARIANT_STYLES: Record<ScannerVariant, { bg: string; border: string; badge: string; badgeText: string; text: string; handle: string }> = {
  onprem: { bg: 'bg-orange-50', border: 'border-orange-400', badge: 'bg-orange-100 text-orange-700', badgeText: 'on-prem', text: 'text-orange-800', handle: '!bg-orange-400' },
  vnext:  { bg: 'bg-teal-50',   border: 'border-teal-400',   badge: 'bg-teal-100 text-teal-700',     badgeText: 'vnext',   text: 'text-teal-800',   handle: '!bg-teal-400' },
}

const DEFAULT_STYLE = { bg: 'bg-gray-100', border: 'border-gray-400', badge: 'bg-gray-100 text-gray-500', badgeText: 'scanner', text: 'text-gray-700', handle: '!bg-gray-400' }

function ScannerNodeComponent({ data, selected }: NodeProps) {
  const label = data.label as string
  const variant = data.variant as ScannerVariant | undefined
  const s = variant ? VARIANT_STYLES[variant] : DEFAULT_STYLE

  return (
    <div
      className={`${s.bg} ${s.text} rounded-lg px-4 py-2.5 border-2 border-dashed shadow-sm min-w-[120px] text-center transition-colors ${
        selected ? 'border-blue-400 ring-2 ring-blue-300' : s.border
      }`}
    >
      <div className={`text-[10px] uppercase tracking-wider mb-0.5 ${s.badge} inline-block px-1.5 py-0.5 rounded text-[9px] font-bold`}>
        {s.badgeText}
      </div>
      <div className="text-xs font-semibold">{label}</div>
      <Handle type="source" position={Position.Right} className={`${s.handle} !w-2 !h-2`} />
    </div>
  )
}

export const ScannerNode = memo(ScannerNodeComponent)
