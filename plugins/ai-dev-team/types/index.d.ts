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

export type Lead = { isWorking: boolean; tool: string }

// auto: small band above the prompt (and the side pane in fullscreen)
// full: big desks in the band; off: hidden
export type OfficeView = 'auto' | 'full' | 'off'

declare module 'claude-code' {
  interface PluginState {
    'ai-dev-team': { desks: Desk[]; lead: Lead; frame: number; view: OfficeView }
  }
}
