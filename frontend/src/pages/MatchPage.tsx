import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Award,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  MapPin,
  Settings2,
  Sparkles,
  User,
  XCircle,
  Zap,
} from 'lucide-react'
import { getDemand, matchResources } from '../api'
import type { FitScore, MatchConfig, MatchResponse, MatchResult } from '../types'

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/demands')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={16} /> Demands
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">Resource Matcher</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col gap-5">
        {/* Demand summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setDemandExpanded((v) => !v)}
            className="w-full flex items-start gap-4 p-6 text-left"
          >
            <div className="w-11 h-11 rounded-xl bg-brand-subtle flex items-center justify-center shrink-0">
              <Briefcase size={20} className="text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {d['Project'] || rrdNumber}
                </h1>
                <span className="text-xs font-mono text-gray-400">{d['RRD Number']}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{d['Client']} · {d['Engagement Name']}</p>
            </div>
            <div className="shrink-0 text-gray-400">
              {demandExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {demandExpanded && (
            <div className="border-t border-gray-100 px-6 pb-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Settings2 size={16} className="text-brand" />
              <span className="font-semibold text-gray-800">Match Configuration</span>
              {hasRun && (
                <span className="ml-auto text-xs text-gray-400">Adjust filters and re-run to update results</span>
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
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'
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
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'
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
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'
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
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand'
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
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600 text-sm flex items-start gap-3">
            <XCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Matching failed</p>
              <p className="mt-1 text-red-500">{error}</p>
              <button onClick={() => run(config)} className="mt-2 text-brand underline text-xs">Try again</button>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            {/* AI Summary */}
            <div className="bg-brand-subtle border border-brand/20 rounded-2xl p-5 flex gap-3">
              <Sparkles size={20} className="text-brand shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-brand mb-1">AI Match Summary</p>
                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Evaluated {result.total_candidates_evaluated} candidates · {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''} found
                </p>
              </div>
            </div>

            {/* Match cards */}
            {result.matches.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                No suitable matches found. Try relaxing your filters.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {result.matches.map((m, i) => (
                  <MatchCard key={m.personnel_no} match={m} rank={i + 1} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function InfoCell({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value?: string; highlight?: boolean }) {
  if (!value) return null
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
        {icon} {label}
      </div>
      <p className={`text-sm font-medium ${highlight ? 'text-brand' : 'text-gray-800'} leading-snug`}>
        {value}
      </p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-14 h-14 border-4 border-brand-subtle rounded-full" />
        <div className="absolute inset-0 w-14 h-14 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <Sparkles size={20} className="absolute inset-0 m-auto text-brand" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-gray-800">AI is matching resources…</p>
        <p className="text-sm text-gray-400 mt-1">Analysing skills, availability, and level fit</p>
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

function MatchCard({ match: m, rank }: { match: MatchResult; rank: number }) {
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
    <div className={`bg-white rounded-2xl border ${cfg.border} shadow-sm overflow-hidden transition-all`}>
      {/* Card header — always visible */}
      <div
        className="p-5 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-4">
          {/* Rank + avatar */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center font-bold text-lg ${cfg.text}`}>
              {rank}
            </div>
          </div>

          {/* Name + quick info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-base">{m.name || m.Name}</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
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
        <div className="border-t border-gray-100 p-5 space-y-4">
          {/* AI reasoning */}
          <div className="flex gap-2">
            <Sparkles size={15} className="text-brand shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{m.reasoning}</p>
          </div>

          {/* Strengths & Gaps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {m.strengths?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Strengths</p>
                <ul className="space-y-1">
                  {m.strengths.map((s, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-gray-700">
                      <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.gaps?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gaps</p>
                <ul className="space-y-1">
                  {m.gaps.map((g, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-gray-700">
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Secondary Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {secondarySkills.map((s) => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Availability & location row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 pt-1 border-t border-gray-100">
            {m['Roll Off Date'] && (
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gray-400" />
                Roll-off: <strong className="text-gray-800">{m['Roll Off Date']}</strong>
              </span>
            )}
            {m['Schedulable As Of'] && (
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400" />
                Schedulable: <strong className="text-gray-800">{m['Schedulable As Of']}</strong>
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
        className="w-full flex items-center justify-center py-2 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 transition-colors"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span className="ml-1">{expanded ? 'Less' : 'More'}</span>
      </button>
    </div>
  )
}
