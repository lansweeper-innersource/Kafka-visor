import type { TopologyData } from '../types'

interface TeamFilterProps {
  topology: TopologyData
  selectedTeams: Set<string>
  onToggleTeam: (team: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
}

export function TeamFilter({
  topology,
  selectedTeams,
  onToggleTeam,
  onSelectAll,
  onSelectNone,
}: TeamFilterProps) {
  const teams = Object.values(topology.teams)
  const serviceCountByTeam = new Map<string, number>()

  for (const service of Object.values(topology.services)) {
    serviceCountByTeam.set(service.team, (serviceCountByTeam.get(service.team) ?? 0) + 1)
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto flex-shrink-0">
      <h2 className="text-sm font-bold text-gray-700 mb-3">Teams</h2>

      <div className="flex gap-2 mb-3">
        <button
          onClick={onSelectAll}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
        >
          All
        </button>
        <button
          onClick={onSelectNone}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
        >
          None
        </button>
      </div>

      <div className="space-y-1">
        {teams.map(team => {
          const count = serviceCountByTeam.get(team.name) ?? 0
          const isSelected = selectedTeams.has(team.name)
          return (
            <label
              key={team.name}
              className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleTeam(team.name)}
                className="rounded"
              />
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: team.color }}
              />
              <span className="text-xs text-gray-700 truncate flex-1">{team.name}</span>
              <span className="text-[10px] text-gray-400">{count}</span>
            </label>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
        {selectedTeams.size === 0
          ? 'Select teams to view their services'
          : `${selectedTeams.size} team${selectedTeams.size > 1 ? 's' : ''} selected`}
      </div>
    </div>
  )
}
