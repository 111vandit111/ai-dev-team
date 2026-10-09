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

// tokens: the main agent's tokens in the current run; sessionTokens: its tokens for the whole session
// (counted outside runs too, never reset by a run, a prompt or /office clear)
export type Lead = { isWorking: boolean; tool: string; tokens: number; sessionTokens: number }

// auto: small band above the prompt (and the side pane in fullscreen)
// full: big desks in the band; off: hidden
export type OfficeView = 'auto' | 'full' | 'off'

export type Office = {
  desks: Desk[]
  lead: Lead
  view: OfficeView
  // a run started this office; the band stays up until a typed prompt follows the finished run
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
