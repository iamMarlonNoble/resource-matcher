import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Search,
  Zap,
} from 'lucide-react'
import { getDemandFilters, getDemands } from '../api'
import type { Demand } from '../types'
import ThemeToggle from '../components/ThemeToggle'

type SortField = 'Project' | 'Requested Start Date' | 'Ageing in Weeks' | 'Management Level'
type SortDir = 'asc' | 'desc'

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'Project', label: 'Project' },
  { field: 'Requested Start Date', label: 'Start Date' },
  { field: 'Ageing in Weeks', label: 'Ageing' },
  { field: 'Management Level', label: 'Level' },
]

export default function Demands() {
  const navigate = useNavigate()
  const [demands, setDemands] = useState<Demand[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [skill, setSkill] = useState('')
  const [level, setLevel] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [levels, setLevels] = useState<string[]>([])

  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getDemands({ search: search || undefined, skill: skill || undefined, level: level || undefined })
      setDemands(res.demands)
      setTotal(res.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load demands')
    } finally {
      setLoading(false)
    }
  }, [search, skill, level])

  const sortedDemands = useMemo(() => {
    if (!sortField) return demands
    return [...demands].sort((a, b) => {
      let aVal = a[sortField] ?? ''
      let bVal = b[sortField] ?? ''
      if (sortField === 'Ageing in Weeks' || sortField === 'Management Level') {
        const aNum = parseFloat(aVal) || 0
        const bNum = parseFloat(bVal) || 0
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum
      }
      if (sortField === 'Requested Start Date') {
        const aDate = new Date(aVal).getTime() || 0
        const bDate = new Date(bVal).getTime() || 0
        return sortDir === 'asc' ? aDate - bDate : bDate - aDate
      }
      return sortDir === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [demands, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  useEffect(() => {
    getDemandFilters().then((f) => {
      setSkills(f.skills)
      setLevels(f.levels)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Resource Matcher</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
          <span className="text-gray-600 dark:text-gray-400 font-medium">Open Demands</span>
          <span className="ml-auto text-sm text-gray-400 dark:text-gray-500 mr-2">{total} demand{total !== 1 ? 's' : ''}</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-gray-400 shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search project, client, RRD…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          {/* Skill filter */}
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="">All Skills</option>
            {skills.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Level filter */}
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="">All Levels</option>
            {levels.map((l) => (
              <option key={l} value={l}>Level {l}</option>
            ))}
          </select>

          {(search || skill || level) && (
            <button
              onClick={() => { setSearch(''); setSkill(''); setLevel('') }}
              className="text-xs text-brand hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">Sort by</span>
          {SORT_OPTIONS.map(({ field, label }) => {
            const active = sortField === field
            return (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-brand hover:text-brand'
                }`}
              >
                {label}
                {active ? (
                  sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                ) : (
                  <ArrowUpDown size={11} className="opacity-40" />
                )}
              </button>
            )
          })}
          {sortField && (
            <button
              onClick={() => { setSortField(null); setSortDir('asc') }}
              className="text-xs text-gray-400 hover:text-brand underline"
            >
              Clear sort
            </button>
          )}
        </div>

        {/* List */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl p-4 text-sm border border-red-200 dark:border-red-800">
            {error} — Make sure both files are uploaded.{' '}
            <button onClick={() => navigate('/')} className="underline">Go back</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-3">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            Loading demands…
          </div>
        ) : demands.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            No demands match your filters.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedDemands.map((d) => (
              <DemandRow key={d['RRD Number']} demand={d} onClick={() => navigate(`/demands/${encodeURIComponent(d['RRD Number'])}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DemandRow({ demand: d, onClick }: { demand: Demand; onClick: () => void }) {
  const overdueLabel = d['Due/Overdue'] || ''
  const isOverdue = overdueLabel.toLowerCase().includes('overdue') || overdueLabel.toLowerCase().includes('due')

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-brand hover:shadow-md hover:shadow-brand/10 transition-all p-5 group"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-brand-subtle dark:bg-brand/20 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-brand transition-colors">
          <Briefcase size={18} className="text-brand group-hover:text-white transition-colors" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">{d.Project}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0">{d['RRD Number']}</span>
            {isOverdue && (
              <span className="text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                {overdueLabel}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">{d.Client}</span>
            {d['Engagement Name'] && d['Engagement Name'] !== d.Project && (
              <span className="truncate max-w-xs">{d['Engagement Name']}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <SkillBadge label={d['Primary Skill']} primary />
            {d['Additional Skills'] && <SkillBadge label={d['Additional Skills']} />}
            <LevelBadge level={d['Management Level']} flex={d['Management Level Flex'] === 'Y'} />
            {d['Source Location'] && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                <MapPin size={11} /> {d['Source Location']}
              </span>
            )}
            {d['Requested Start Date'] && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                <Calendar size={11} /> {d['Requested Start Date']}
              </span>
            )}
            {d['Ageing in Weeks'] && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                <Clock size={11} /> {d['Ageing in Weeks']} wks
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-brand shrink-0 mt-2 transition-colors" />
      </div>
    </button>
  )
}

function SkillBadge({ label, primary }: { label: string; primary?: boolean }) {
  if (!label) return null
  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
        primary ? 'bg-brand text-white' : 'bg-brand-subtle text-brand'
      }`}
    >
      {label}
    </span>
  )
}

function LevelBadge({ level, flex }: { level: string; flex: boolean }) {
  if (!level) return null
  return (
    <span className="text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
      Level {level}{flex ? ' ±1' : ''}
    </span>
  )
}
