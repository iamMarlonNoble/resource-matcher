import type { Demand, MatchConfig, MatchResponse, HealthResponse } from './types'

const BASE = 'http://localhost:8000'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getHealth(): Promise<HealthResponse> {
  return req('/api/health')
}

export async function getConfigStatus(): Promise<{ configured: boolean; key_preview: string }> {
  return req('/api/config/status')
}

export async function setApiKey(key: string): Promise<{ ok: boolean }> {
  return req('/api/config/key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  })
}

export async function uploadRoster(file: File) {
  const form = new FormData()
  form.append('file', file)
  return req<{ message: string; raw_rows: number; unique_resources: number }>(
    '/api/upload/roster',
    { method: 'POST', body: form }
  )
}

export async function uploadDemands(file: File) {
  const form = new FormData()
  form.append('file', file)
  return req<{ message: string; total_rows: number; active_demands: number }>(
    '/api/upload/demands',
    { method: 'POST', body: form }
  )
}

export async function getDemands(params?: {
  search?: string
  skill?: string
  level?: string
}): Promise<{ demands: Demand[]; total: number }> {
  const q = new URLSearchParams()
  if (params?.search) q.set('search', params.search)
  if (params?.skill) q.set('skill', params.skill)
  if (params?.level) q.set('level', params.level)
  return req(`/api/demands?${q}`)
}

export async function getDemandFilters(): Promise<{ skills: string[]; levels: string[] }> {
  return req('/api/demands/filters')
}

export async function getDemand(rrdNumber: string): Promise<Record<string, string>> {
  return req(`/api/demands/${encodeURIComponent(rrdNumber)}`)
}

export async function matchResources(rrdNumber: string, config?: MatchConfig): Promise<MatchResponse> {
  return req(`/api/match/${encodeURIComponent(rrdNumber)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config ?? {}),
  })
}
