export interface Demand {
  'RRD Number': string
  Project: string
  'Engagement Name': string
  Client: string
  'Management Level': string
  'Primary Skill': string
  'Additional Skills': string
  'Demand Status': string
  'Requested Start Date': string
  'Expected Fulfillment Date': string
  'Source Location': string
  'Management Level Flex': string
  'Location Flex': string
  'Project Role': string
  'Job Family Group': string
  Domain: string
  'Project Industry Sector': string
  'Due/Overdue': string
  'Ageing in Weeks': string
  'Demand Segmentation': string
}

export type FitScore = 'Excellent' | 'Good' | 'Fair'

export interface MatchResult {
  personnel_no: string
  name: string
  fit_score: FitScore
  fit_percentage: number
  reasoning: string
  strengths: string[]
  gaps: string[]
  // From roster
  Name: string
  Level: string
  'Primary Skill': string
  'Secondary Skills': string
  'Primary Proficiency': string
  Availability: string
  'Roll Off Date': string
  'Schedulable As Of': string
  'Resource Location': string
  'Home Loc': string
  Email: string
  'Current Projects': string
  'Job Family Group': string
  'Bench Ageing (Months)': string
}

export interface MatchResponse {
  demand: Record<string, string>
  matches: MatchResult[]
  summary: string
  total_candidates_evaluated: number
}

export interface HealthResponse {
  status: string
  roster_loaded: boolean
  demands_loaded: boolean
  roster_count: number
  demands_count: number
}
