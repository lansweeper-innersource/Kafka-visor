import type { InteractionType } from '../types'

interface InteractionStyle {
  stroke: string
  badgeBg: string
  badgeText: string
}

const INTERACTION_COLORS: Record<InteractionType, InteractionStyle> = {
  kafka:    { stroke: '#22C55E', badgeBg: '#14532D', badgeText: '#fff' },
  grpc:     { stroke: '#A855F7', badgeBg: '#581C87', badgeText: '#fff' },
  https:    { stroke: '#F97316', badgeBg: '#7C2D12', badgeText: '#fff' },
  db:       { stroke: '#F59E0B', badgeBg: '#78350F', badgeText: '#fff' },
  internal: { stroke: '#6B7280', badgeBg: '#374151', badgeText: '#fff' },
  sqs:      { stroke: '#E879F9', badgeBg: '#701A75', badgeText: '#fff' },
  unknown:  { stroke: '#9CA3AF', badgeBg: '#4B5563', badgeText: '#fff' },
}

const DEFAULT_STYLE: InteractionStyle = { stroke: '#6B7280', badgeBg: '#374151', badgeText: '#fff' }

export function getInteractionStyle(type: string): InteractionStyle {
  return INTERACTION_COLORS[type as InteractionType] ?? DEFAULT_STYLE
}
