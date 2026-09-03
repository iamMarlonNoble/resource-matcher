import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Upload as UploadIcon,
  Users,
  Zap,
} from 'lucide-react'
import { getConfigStatus, getHealth, setApiKey, uploadDemands, uploadRoster } from '../api'
import ThemeToggle from '../components/ThemeToggle'

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  message: string
  count?: number
}

export default function Upload() {
  const navigate = useNavigate()
  const [roster, setRoster] = useState<UploadState>({ status: 'idle', message: '' })
  const [demands, setDemands] = useState<UploadState>({ status: 'idle', message: '' })

  // API key state
  const [apiKey, setApiKeyInput] = useState('')
  const [keyStatus, setKeyStatus] = useState<'unchecked' | 'set' | 'saving' | 'error'>('unchecked')
  const [keyPreview, setKeyPreview] = useState('')
  const [showKey, setShowKey] = useState(false)

  // Restore previous session state
  useEffect(() => {
    getHealth().then((h) => {
      if (h.roster_loaded)
        setRoster({ status: 'success', message: 'Previously loaded', count: h.roster_count })
      if (h.demands_loaded)
        setDemands({ status: 'success', message: 'Previously loaded', count: h.demands_count })
    }).catch(() => {})

    getConfigStatus().then((s) => {
      if (s.configured) { setKeyStatus('set'); setKeyPreview(s.key_preview) }
      else setKeyStatus('error')
    }).catch(() => {})
  }, [])

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return
    setKeyStatus('saving')
    try {
      await setApiKey(apiKey.trim())
      setKeyStatus('set')
      setKeyPreview(`${apiKey.trim().slice(0, 8)}...`)
      setApiKeyInput('')
    } catch {
      setKeyStatus('error')
    }
  }

  const handleRoster = useCallback(async (file: File) => {
    setRoster({ status: 'uploading', message: 'Parsing roster…' })
    try {
      const r = await uploadRoster(file)
      setRoster({ status: 'success', message: r.message, count: r.unique_resources })
    } catch (e: unknown) {
      setRoster({ status: 'error', message: e instanceof Error ? e.message : 'Upload failed' })
    }
  }, [])

  const handleDemands = useCallback(async (file: File) => {
    setDemands({ status: 'uploading', message: 'Parsing demands…' })
    try {
      const r = await uploadDemands(file)
      setDemands({ status: 'success', message: r.message, count: r.active_demands })
    } catch (e: unknown) {
      setDemands({ status: 'error', message: e instanceof Error ? e.message : 'Upload failed' })
    }
  }, [])

  const bothLoaded = roster.status === 'success' && demands.status === 'success'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand flex items-center justify-center shadow-md shadow-brand/30">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Resource Matcher</span>
          <span className="ml-1 text-xs bg-brand-subtle dark:bg-brand/20 text-brand font-semibold px-2 py-0.5 rounded-full">
            AI-Powered
          </span>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-14">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
            Match Resources to Open Demands
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto">
            Upload your HC Roster and Demands extracts. Our AI will instantly rank the best
            resource fits for any open demand.
          </p>
        </div>

        {/* API Key Panel */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 mb-2 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-brand" />
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Groq API Key</span>
            {keyStatus === 'set' && (
              <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                <CheckCircle size={11} /> Configured · {keyPreview}
              </span>
            )}
            {keyStatus === 'error' && (
              <span className="ml-auto text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                Not set
              </span>
            )}
          </div>

          {keyStatus !== 'set' && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="gsk_…  (get yours free at console.groq.com)"
                  value={apiKey}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                  className="w-full pr-9 pl-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim() || keyStatus === 'saving'}
                className="px-4 py-2 text-sm font-semibold bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {keyStatus === 'saving' ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}

          {keyStatus === 'set' && (
            <button
              onClick={() => setKeyStatus('error')}
              className="self-start text-xs text-gray-400 hover:text-brand underline"
            >
              Change key
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <UploadCard
            title="Roster (HC Report)"
            subtitle="Resources with skills & availability"
            icon={<Users size={22} className="text-brand" />}
            accept=".csv,.xlsx,.xls"
            state={roster}
            countLabel="resources"
            onFile={handleRoster}
          />
          <UploadCard
            title="Demands List"
            subtitle="Open positions & project requirements"
            icon={<Briefcase size={22} className="text-brand" />}
            accept=".csv,.xlsx,.xls"
            state={demands}
            countLabel="active demands"
            onFile={handleDemands}
          />
        </div>

        {bothLoaded && (
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/demands')}
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-lg px-10 py-3.5 rounded-xl shadow-lg shadow-brand/25 transition-all hover:scale-[1.02] active:scale-100"
            >
              Browse Demands <ArrowRight size={20} />
            </button>
          </div>
        )}

        {!bothLoaded && (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-2">
            Upload both files to continue
          </p>
        )}
      </main>
    </div>
  )
}

function UploadCard({
  title,
  subtitle,
  icon,
  accept,
  state,
  countLabel,
  onFile,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  accept: string
  state: UploadState
  countLabel: string
  onFile: (f: File) => void
}) {
  const pick = useCallback(
    (files: FileList | null) => {
      if (files?.[0]) onFile(files[0])
    },
    [onFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      pick(e.dataTransfer.files)
    },
    [pick]
  )

  const onDragOver = (e: React.DragEvent) => e.preventDefault()

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-subtle dark:bg-brand/20 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>

      {state.status === 'success' ? (
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">
              {state.count?.toLocaleString()} {countLabel} loaded
            </span>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => pick(e.target.files)}
            />
            <RefreshCw size={15} className="text-emerald-500 hover:text-emerald-700 transition-colors" />
          </label>
        </div>
      ) : (
        <label
          onDrop={onDrop}
          onDragOver={onDragOver}
          className={[
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all',
            state.status === 'uploading'
              ? 'border-brand bg-brand-subtle dark:bg-brand/10'
              : state.status === 'error'
              ? 'border-red-300 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-200 dark:border-gray-600 hover:border-brand hover:bg-brand-subtle dark:hover:bg-brand/10',
          ].join(' ')}
        >
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => pick(e.target.files)}
          />
          {state.status === 'uploading' ? (
            <div className="flex items-center gap-2 text-brand">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Processing…</span>
            </div>
          ) : state.status === 'error' ? (
            <div className="flex flex-col items-center gap-1 text-red-500 px-4 text-center">
              <AlertCircle size={22} />
              <span className="text-xs mt-1">{state.message}</span>
            </div>
          ) : (
            <>
              <UploadIcon size={30} className="text-gray-300 dark:text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Drop file here</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">or click to browse · CSV or Excel</span>
            </>
          )}
        </label>
      )}
    </div>
  )
}
