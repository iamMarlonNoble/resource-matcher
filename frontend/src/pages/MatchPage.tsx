import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlignJustify,
  ArrowLeft,
  Award,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Columns2,
  Clock,
  Download,
  LayoutList,
  Mail,
  MapPin,
  Settings2,
  Sparkles,
  User,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { getDemand, matchResources } from '../api'
import type { FitScore, MatchConfig, MatchResponse, MatchResult } from '../types'
import ThemeToggle from '../components/ThemeToggle'

const DEFAULT_CONFIG: MatchConfig = {
  level_window: 2,
  availability_filter: 'all',
  location_filter: 'all',
  skill_strictness: 'any',
}

export default function MatchPage() {
  const { rrdNumber } = useParams<{ rrdNumber: string }>()
  const navigate = useNavigate()

  const [demand, setDemand] = useState<Record<string, string>>({})
  const [config, setConfig] = useState<MatchConfig>(DEFAULT_CONFIG)
  const [result, setResult] = useState<MatchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demandExpanded, setDemandExpanded] = useState(true)
  const [hasRun, setHasRun] = useState(false)
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showComparison, setShowComparison] = useState(false)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else if (next.size < 4) { next.add(id) }
      return next
    })
  }

  // Load demand details so header and config defaults show immediately
  useEffect(() => {
    if (!rrdNumber) return
    getDemand(decodeURIComponent(rrdNumber)).then(setDemand).catch(() => {})
  }, [rrdNumber])

  const run = async (cfg: MatchConfig = config) => {
    if (!rrdNumber) return
    setLoading(true)
    setError('')
    setResult(null)
    setHasRun(true)
    setSelectedIds(new Set())
    setShowComparison(false)
    try {
      const r = await matchResources(decodeURIComponent(rrdNumber), cfg)
      setDemand(r.demand)
      setResult(r)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Matching failed')
    } finally {
      setLoading(false)
    }
  }

  const d = demand

  const exportToExcel = () => {
    if (!result) return
    const wb = XLSX.utils.book_new()

    // Sheet 1: Demand details
    const demandRows = Object.entries(result.demand).map(([k, v]) => ({ Field: k, Value: v }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(demandRows), 'Demand')

    // Sheet 2: Match results
    const matchRows = result.matches.map((m, i) => ({
      Rank: i + 1,
      Name: m.name || m.Name,
      'Fit Score': m.fit_score,
      'Fit %': m.fit_percentage,
      Level: m.Level,
      'Primary Skill': m['Primary Skill'],
      'Primary Proficiency': m['Primary Proficiency'],
      'Secondary Skills': m['Secondary Skills'],
      Availability: m.Availability,
      'Roll Off Date': m['Roll Off Date'],
      'Schedulable As Of': m['Schedulable As Of'],
      Location: m['Home Loc'] || m['Resource Location'],
      'Current Projects': m['Current Projects'],
      Email: m.Email,
      Reasoning: m.reasoning,
      Strengths: (m.strengths || []).join('; '),
      Gaps: (m.gaps || []).join('; '),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matchRows), 'Match Results')

    // Sheet 3: AI report
    const reportRows = [
      { Section: 'Overall Assessment', Content: result.summary },
      { Section: 'Ranking Rationale', Content: result.ranking_rationale },
      { Section: 'Talent Pool Insights', Content: result.pool_insights },
    ].filter((r) => r.Content)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reportRows), 'AI Report')

    const rrd = result.demand['RRD Number'] || decodeURIComponent(rrdNumber || '')
    XLSX.writeFile(wb, `ResourceMatch_${rrd}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/demands')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={16} /> Demands
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Resource Matcher</span>
          </div>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* Demand summary card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <button
            onClick={() => setDemandExpanded((v) => !v)}
            className="w-full flex items-start gap-4 p-6 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-subtle dark:bg-brand/20 flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {d['Project'] || rrdNumber}
                </h1>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{d['RRD Number']}</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{d['Client']} · {d['Engagement Name']}</p>
            </div>
            <div className="shrink-0 text-gray-400 dark:text-gray-500">
              {demandExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {demandExpanded && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-6 pb-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoCell icon={<Award size={14} />} label="Required Skill" value={d['Primary Skill']} highlight />
              <InfoCell icon={<User size={14} />} label="Level" value={d['Management Level'] ? `Level ${d['Management Level']}${d['Management Level Flex'] === 'Y' ? ' (flex)' : ''}` : ''} />
              <InfoCell icon={<MapPin size={14} />} label="Location" value={d['Source Location']} />
              <InfoCell icon={<Calendar size={14} />} label="Start Date" value={d['Requested Start Date']} />
              <InfoCell icon={<Briefcase size={14} />} label="Role" value={d['Project Role']} />
              <InfoCell icon={<Sparkles size={14} />} label="Good to Have" value={d['Additional Skills']} />
              <InfoCell icon={<Clock size={14} />} label="Fulfillment By" value={d['Expected Fulfillment Date']} />
              <InfoCell icon={<Award size={14} />} label="Industry" value={d['Project Industry Sector']} />
            </div>
          )}
        </div>

        {/* Config panel — always visible until results load */}
        {!loading && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Settings2 size={16} className="text-brand" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Match Configuration</span>
              {hasRun && (
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Adjust filters and re-run to update results</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Level window */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Level Range</p>
                <div className="flex flex-wrap gap-2">
                  {[{ v: 0, label: 'Exact only' }, { v: 1, label: '±1 level' }, { v: 2, label: '±2 levels' }, { v: 3, label: '±3 levels' }].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setConfig((c) => ({ ...c, level_window: v }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        config.level_window === v
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Availability</p>
                <div className="flex flex-wrap gap-2">
                  {[{ v: 'all', label: 'All resources' }, { v: 'bench_only', label: 'Bench / Available only' }].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setConfig((c) => ({ ...c, availability_filter: v as MatchConfig['availability_filter'] }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        config.availability_filter === v
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Location</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'all', label: 'All locations' },
                    { v: 'demand', label: d['Source Location'] ? `${d['Source Location']} only` : 'Match demand location' },
                  ].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setConfig((c) => ({ ...c, location_filter: v as MatchConfig['location_filter'] }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        config.location_filter === v
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill match */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skill Match</p>
                <div className="flex flex-wrap gap-2">
                  {[{ v: 'any', label: 'Primary or secondary' }, { v: 'primary_only', label: 'Primary must match' }].map(({ v, label }) => (
                    <button
                      key={v}
                      onClick={() => setConfig((c) => ({ ...c, skill_strictness: v as MatchConfig['skill_strictness'] }))}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        config.skill_strictness === v
                          ? 'bg-brand text-white border-brand'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-brand hover:text-brand'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => run(config)}
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-md shadow-brand/20 transition-all hover:scale-[1.02] active:scale-100"
              >
                <Sparkles size={15} />
                {hasRun ? 'Re-run Match' : 'Run AI Match'}
              </button>
              {hasRun && (
                <button
                  onClick={() => { setConfig(DEFAULT_CONFIG) }}
                  className="text-xs text-gray-400 hover:text-brand underline"
                >
                  Reset to defaults
                </button>
              )}
            </div>
          </div>
        )}

        {loading && <LoadingState />}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
            <XCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Matching failed</p>
              <p className="mt-1 text-red-500 dark:text-red-400">{error}</p>
              <button onClick={() => run(config)} className="mt-2 text-brand underline text-xs">Try again</button>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            {/* AI Summary */}
            <div className="bg-brand-subtle dark:bg-brand/10 border border-brand/20 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-4 pb-3">
                <Sparkles size={16} className="text-brand shrink-0" />
                <p className="text-sm font-bold text-brand">AI Match Report</p>
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                  {result.total_candidates_evaluated} evaluated · {result.matches.length} ranked
                </span>
              </div>

              <div className="px-5 pb-5 space-y-4">
                {result.summary && (
                  <div>
                    <p className="text-xs font-semibold text-brand/70 uppercase tracking-wide mb-1.5">Overall Assessment</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.summary}</p>
                  </div>
                )}
                {result.ranking_rationale && (
                  <div>
                    <p className="text-xs font-semibold text-brand/70 uppercase tracking-wide mb-1.5">Ranking Rationale</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.ranking_rationale}</p>
                  </div>
                )}
                {result.pool_insights && (
                  <div>
                    <p className="text-xs font-semibold text-brand/70 uppercase tracking-wide mb-1.5">Talent Pool Insights</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.pool_insights}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Results header with view toggle */}
            {result.matches.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {result.matches.length} candidate{result.matches.length !== 1 ? 's' : ''} ranked
                </p>
                <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-brand dark:hover:text-brand border border-gray-200 dark:border-gray-700 hover:border-brand px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download size={13} /> Export Excel
                </button>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('detailed')}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                      viewMode === 'detailed'
                        ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <LayoutList size={13} /> Detailed
                  </button>
                  <button
                    onClick={() => setViewMode('compact')}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                      viewMode === 'compact'
                        ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <AlignJustify size={13} /> Compact
                  </button>
                </div>
                </div>
              </div>
            )}

            {/* Match cards */}
            {result.matches.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No suitable matches found. Try relaxing your filters.
              </div>
            ) : viewMode === 'detailed' ? (
              <div className="flex flex-col gap-4">
                {result.matches.map((m, i) => (
                  <MatchCard
                    key={m.personnel_no}
                    match={m}
                    rank={i + 1}
                    selected={selectedIds.has(m.personnel_no)}
                    onToggleSelect={() => toggleSelect(m.personnel_no)}
                    selectDisabled={!selectedIds.has(m.personnel_no) && selectedIds.size >= 4}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {result.matches.map((m, i) => (
                  <CompactRow
                    key={m.personnel_no}
                    match={m}
                    rank={i + 1}
                    isLast={i === result.matches.length - 1}
                    selected={selectedIds.has(m.personnel_no)}
                    onToggleSelect={() => toggleSelect(m.personnel_no)}
                    selectDisabled={!selectedIds.has(m.personnel_no) && selectedIds.size >= 4}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating selection bar */}
      {selectedIds.size >= 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
            <span className="text-gray-400 ml-1">· max 4</span>
          </span>
          {selectedIds.size >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors"
            >
              <Columns2 size={14} /> Compare
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-white transition-colors ml-1"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Comparison modal */}
      {showComparison && result && (
        <ComparisonModal
          matches={result.matches.filter((m) => selectedIds.has(m.personnel_no))}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  )
}

function InfoCell({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value?: string; highlight?: boolean }) {
  if (!value) return null
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mb-1">
        {icon} {label}
      </div>
      <p className={`text-sm font-medium ${highlight ? 'text-brand' : 'text-gray-800 dark:text-gray-200'} leading-snug`}>
        {value}
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-12 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-14 h-14 border-4 border-brand-subtle dark:border-brand/20 rounded-full" />
        <div className="absolute inset-0 w-14 h-14 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <Sparkles size={20} className="absolute inset-0 m-auto text-brand" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800 dark:text-gray-200">AI is matching resources…</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Analysing skills, availability, and level fit</p>
      </div>
    </div>
  )
}

const fitConfig: Record<FitScore, { bg: string; border: string; text: string; dot: string }> = {
  Excellent: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  Good: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  Fair: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
}

function MatchCard({ match: m, rank, selected, onToggleSelect, selectDisabled }: {
  match: MatchResult; rank: number
  selected: boolean; onToggleSelect: () => void; selectDisabled: boolean
}) {
  const [expanded, setExpanded] = useState(rank <= 3)
  const cfg = fitConfig[m.fit_score] ?? fitConfig.Fair

  const secondarySkills = (m['Secondary Skills'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const isAvailable =
    (m.Availability || '').toLowerCase().includes('available') ||
    (m.Availability || '').toLowerCase().includes('bench')

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border ${selected ? 'border-brand ring-2 ring-brand/20' : `${cfg.border} dark:border-gray-700`} shadow-sm overflow-hidden transition-all`}>
      {/* Card header — always visible */}
      <div
        className="p-5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-4">
          {/* Select checkbox */}
          <div
            className="shrink-0 mt-1"
            onClick={(e) => { e.stopPropagation(); if (!selectDisabled) onToggleSelect() }}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
              selected ? 'bg-brand border-brand' : selectDisabled ? 'border-gray-200 opacity-40 cursor-not-allowed' : 'border-gray-300 hover:border-brand'
            }`}>
              {selected && <CheckCircle size={13} className="text-white" />}
            </div>
          </div>
          {/* Rank + avatar */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center font-bold text-lg ${cfg.text}`}>
              {rank}
            </div>
          </div>

          {/* Name + quick info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 dark:text-gray-100 text-base">{m.name || m.Name}</span>
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                Level {m.Level}
              </span>
              {isAvailable && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  {m.Availability}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-sm font-medium text-brand">{m['Primary Skill']}</span>
              {m['Primary Proficiency'] && (
                <span className="text-xs text-gray-400">{m['Primary Proficiency']}</span>
              )}
            </div>
          </div>

          {/* Fit badge */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <div className={`flex items-center gap-1.5 ${cfg.bg} ${cfg.text} px-3 py-1 rounded-full`}>
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs font-bold">{m.fit_score}</span>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-extrabold ${cfg.text}`}>{m.fit_percentage}%</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${cfg.dot} transition-all`}
            style={{ width: `${m.fit_percentage}%` }}
          />
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-5 space-y-4">
          {/* AI reasoning */}
          <div className="flex gap-2">
            <Sparkles size={15} className="text-brand shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{m.reasoning}</p>
          </div>

          {/* Strengths & Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {m.strengths?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Strengths</p>
                <ul className="space-y-1">
                  {m.strengths.map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.gaps?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Gaps</p>
                <ul className="space-y-1">
                  {m.gaps.map((g, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                      <XCircle size={13} className="text-amber-400 shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Secondary skills */}
          {secondarySkills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Secondary Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {secondarySkills.map((s) => (
                  <span key={s} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability & location row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
            {m['Roll Off Date'] && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" />
                Roll-off: <strong className="text-gray-800 dark:text-gray-200">{m['Roll Off Date']}</strong>
              </span>
            )}
            {m['Schedulable As Of'] && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" />
                Schedulable: <strong className="text-gray-800 dark:text-gray-200">{m['Schedulable As Of']}</strong>
              </span>
            )}
            {m['Resource Location'] && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gray-400" />
                {m['Resource Location']}
              </span>
            )}
            {m['Current Projects'] && (
              <span className="flex items-center gap-1.5">
                <Briefcase size={13} className="text-gray-400" />
                <span className="truncate max-w-xs">{m['Current Projects']}</span>
              </span>
            )}
            {m.Email && (
              <a
                href={`mailto:${m.Email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-brand hover:underline"
              >
                <Mail size={13} />
                {m.Email}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-center py-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border-t border-gray-100 dark:border-gray-700 transition-colors"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span className="ml-1">{expanded ? 'Less' : 'More'}</span>
      </button>
    </div>
  )
}

function CompactRow({ match: m, rank, isLast, selected, onToggleSelect, selectDisabled }: {
  match: MatchResult; rank: number; isLast: boolean
  selected: boolean; onToggleSelect: () => void; selectDisabled: boolean
}) {
  const cfg = fitConfig[m.fit_score] ?? fitConfig.Fair
  const isAvailable =
    (m.Availability || '').toLowerCase().includes('available') ||
    (m.Availability || '').toLowerCase().includes('bench')

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${selected ? 'bg-brand/5' : ''} ${!isLast ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}>
      {/* Checkbox */}
      <div
        onClick={() => { if (!selectDisabled) onToggleSelect() }}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          selected ? 'bg-brand border-brand' : selectDisabled ? 'border-gray-200 opacity-40 cursor-not-allowed' : 'border-gray-300 hover:border-brand'
        }`}
      >
        {selected && <CheckCircle size={13} className="text-white" />}
      </div>

      {/* Rank */}
      <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center font-bold text-sm ${cfg.text} shrink-0`}>
        {rank}
      </div>

      {/* Name + level */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{m.name || m.Name}</span>
          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Lv {m.Level}</span>
          {isAvailable && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              {m.Availability}
            </span>
          )}
        </div>
        <p className="text-xs text-brand mt-0.5 truncate">
          {m['Primary Skill']}{m['Primary Proficiency'] ? ` · ${m['Primary Proficiency']}` : ''}
        </p>
      </div>

      {/* Location */}
      {(m['Home Loc'] || m['Resource Location']) && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0">
          <MapPin size={11} />{m['Home Loc'] || m['Resource Location']}
        </span>
      )}

      {/* Fit badge + % */}
      <div className="flex items-center gap-2 shrink-0">
        <div className={`flex items-center gap-1 ${cfg.bg} ${cfg.text} px-2.5 py-1 rounded-full`}>
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className="text-xs font-bold">{m.fit_score}</span>
        </div>
        <span className={`text-sm font-extrabold ${cfg.text} w-10 text-right`}>{m.fit_percentage}%</span>
      </div>
    </div>
  )
}

function ComparisonModal({ matches, onClose }: { matches: MatchResult[]; onClose: () => void }) {
  const colWidth = matches.length === 2 ? 'w-1/2' : matches.length === 3 ? 'w-1/3' : 'w-1/4'

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="w-36 shrink-0 px-4 py-3 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-start pt-3.5">
        {label}
      </div>
      <div className="flex flex-1 divide-x divide-gray-100 dark:divide-gray-700">{children}</div>
    </div>
  )

  const Cell = ({ children }: { children: React.ReactNode }) => (
    <div className={`${colWidth} px-4 py-3 text-sm text-gray-700 dark:text-gray-300 min-w-0`}>{children}</div>
  )

  return (
    <div className="fixed inset-0 z-30 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <Columns2 size={18} className="text-brand" />
          <h2 className="font-bold text-gray-900 dark:text-white">Comparing {matches.length} Candidates</h2>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Candidate name headers */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="w-36 shrink-0" />
          <div className="flex flex-1 divide-x divide-gray-100">
            {matches.map((m) => {
              const cfg = fitConfig[m.fit_score] ?? fitConfig.Fair
              return (
                <div key={m.personnel_no} className={`${colWidth} px-4 py-3`}>
                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{m.name || m.Name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs font-bold ${cfg.text}`}>{m.fit_percentage}%</span>
                    <div className={`flex items-center gap-1 ${cfg.bg} ${cfg.text} px-2 py-0.5 rounded-full`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className="text-xs font-semibold">{m.fit_score}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Scrollable rows */}
        <div className="overflow-y-auto flex-1">
          <Row label="Level">
            {matches.map((m) => <Cell key={m.personnel_no}>Level {m.Level}</Cell>)}
          </Row>
          <Row label="Primary Skill">
            {matches.map((m) => <Cell key={m.personnel_no}><span className="text-brand font-medium">{m['Primary Skill']}</span></Cell>)}
          </Row>
          <Row label="Proficiency">
            {matches.map((m) => <Cell key={m.personnel_no}>{m['Primary Proficiency'] || '—'}</Cell>)}
          </Row>
          <Row label="Secondary Skills">
            {matches.map((m) => (
              <Cell key={m.personnel_no}>
                {m['Secondary Skills']
                  ? m['Secondary Skills'].split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                      <span key={s} className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mr-1 mb-1">{s}</span>
                    ))
                  : '—'}
              </Cell>
            ))}
          </Row>
          <Row label="Availability">
            {matches.map((m) => {
              const avail = m.Availability || '—'
              const isAvail = avail.toLowerCase().includes('available') || avail.toLowerCase().includes('bench')
              return (
                <Cell key={m.personnel_no}>
                  <span className={isAvail ? 'text-emerald-600 font-medium' : ''}>{avail}</span>
                </Cell>
              )
            })}
          </Row>
          <Row label="Schedulable">
            {matches.map((m) => <Cell key={m.personnel_no}>{m['Schedulable As Of'] || '—'}</Cell>)}
          </Row>
          <Row label="Roll-off">
            {matches.map((m) => <Cell key={m.personnel_no}>{m['Roll Off Date'] || '—'}</Cell>)}
          </Row>
          <Row label="Location">
            {matches.map((m) => <Cell key={m.personnel_no}>{m['Home Loc'] || m['Resource Location'] || '—'}</Cell>)}
          </Row>
          <Row label="Strengths">
            {matches.map((m) => (
              <Cell key={m.personnel_no}>
                {m.strengths?.length
                  ? <ul className="space-y-1">{m.strengths.map((s, i) => <li key={i} className="flex gap-1.5"><CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />{s}</li>)}</ul>
                  : '—'}
              </Cell>
            ))}
          </Row>
          <Row label="Gaps">
            {matches.map((m) => (
              <Cell key={m.personnel_no}>
                {m.gaps?.length
                  ? <ul className="space-y-1">{m.gaps.map((g, i) => <li key={i} className="flex gap-1.5"><XCircle size={12} className="text-amber-400 shrink-0 mt-0.5" />{g}</li>)}</ul>
                  : <span className="text-emerald-600 text-xs font-medium">No gaps</span>}
              </Cell>
            ))}
          </Row>
          <Row label="AI Reasoning">
            {matches.map((m) => (
              <Cell key={m.personnel_no}>
                <p className="text-xs text-gray-600 leading-relaxed">{m.reasoning || '—'}</p>
              </Cell>
            ))}
          </Row>
          <Row label="Email">
            {matches.map((m) => (
              <Cell key={m.personnel_no}>
                {m.Email
                  ? <a href={`mailto:${m.Email}`} className="text-brand hover:underline text-xs">{m.Email}</a>
                  : '—'}
              </Cell>
            ))}
          </Row>
        </div>
      </div>
    </div>
  )
}
