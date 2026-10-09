export type DeskStatus = 'working' | 'done' | 'failed'

export type Desk = {
  id: string
  role: string
  label: string
  model: string
  effort: string
  status: DeskStatus
  tool: string
  tokens: number
}

export type Lead = { isWorking: boolean; tool: string; tokens: number }

// auto: small band above the prompt (and the side pane in fullscreen)
// full: big desks in the band; off: hidden
export type OfficeView = 'auto' | 'full' | 'off'

export type Office = {
  desks: Desk[]
  lead: Lead
  view: OfficeView
  // the agent-team skill started this office; it stays up until the next run or prompt
  isActive: boolean
  // false once the run finished (the main turn ended without .agent-team/RUNNING)
  isRunning: boolean
  frame: number
}

declare module 'claude-code' {
  interface PluginState {
    'ai-dev-team': { office: Office }
  }
}
