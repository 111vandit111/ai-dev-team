import { atom, read, update } from 'claude-code'
import type { AgentSpawnInput, EngineInterface, Register } from 'claude-code'

import type { Desk, Office, OfficeView } from '../types'

// The agent office: every sub-agent is a person at a desk, the main agent sits at
// the center desk. Drawn from engine events only: no model calls, no tokens.
//
// Hooks change the office only in this module's memory, synchronously, so no
// change is lost when a hook's event ends. A timer started at session start does
// everything asynchronous: it publishes that memory for drawing, opens the side
// pane and animates the desks.
//
// The office opens when a run starts: the agent-team skill, a sub-agent spawned with a
// `Role:` line, or a .agent-team/RUNNING lock. The last run stays in the pane until the
// next run starts. It shows as a band above the prompt, and as a side pane only in the
// fullscreen layout, where the pane docks beside the transcript. It never opens a pane
// inline on its own: dismissing an inline pane with Esc during a run would interrupt the
// turn and stop every agent.

const PANE = 'agent-office'
const TITLE = 'Agent office'
const TICK_MS = 400
const BIG_DESK = 24
const MINI_DESK = 12
const LEAD_DESK = 15
const BAND_ROWS = 5
// Without a known run, look for the RUNNING lock every this many ticks (about 2s).
const RUNNING_PROBE_TICKS = 5

const EMPTY: Office = {
  desks: [],
  lead: { isWorking: false, tool: '', tokens: 0, sessionTokens: 0 },
  view: 'auto',
  isActive: false,
  isRunning: false,
  frame: 0,
}
const office = atom({ plugin: 'ai-dev-team', key: 'office' } as const, EMPTY)

const BIG = {
  typingA: [' o   .----.', '/|\\_ |=== |', '/ \\  \'----\''],
  typingB: [' o   .----.', '/|_/ |==  |', '/ \\  \'----\''],
  done: [' o/  .----.', '/|   | ok |', '/ \\  \'----\''],
  failed: [' o   .----.', '/|\\  | !! |', '/ \\  \'----\''],
  idle: [' o   .----.', '/|\\  |    |', '/ \\  \'----\''],
}

const MINI = {
  typingA: [' o   _', '/|\\_|=|'],
  typingB: [' o   _', '/|_/|-|'],
  done: [' o/  _', '/|  |v|'],
  failed: [' o   _', '/|\\ |!|'],
  idle: [' o   _', '/|\\ | |'],
}

const MINI_LEAD = {
  typingA: [' o   ____', '/|\\_|====|'],
  typingB: [' o   ____', '/|_/|=== |'],
  idle: [' o   ____', '/|\\ |    |'],
}

// The office as this module knows it. Only hooks change it, and only synchronously.
let model: Office = EMPTY
let version = 0
let published = -1
let wantsPane = false
let wantsRunningCheck = false
let quietTicks = 0
let isFullscreen = false
let projectDir = ''

function change(next: Office) {
  model = next
  version += 1
}

const shortModel = (name: string) => name.match(/haiku|sonnet|opus|fable/i)?.[0].toLowerCase() ?? name
const formatTokens = (n: number) => (n <= 0 ? '-' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)
const clip = (text: string, width: number) => (text.length > width ? text.slice(0, width - 1) + '~' : text)
const colorFor = (status: string) => (status === 'working' ? 'yellow' : status === 'done' ? 'green' : 'red')
const isBusy = (o: Office) => o.lead.isWorking || o.desks.some(desk => desk.status === 'working')

const ROLE_LINE = /^\s*Role:\s*([\w-]+)/m
const hasRoleLine = (prompt: string) => ROLE_LINE.test(prompt)
const roleOf = (prompt: string, subagentType: string) =>
  prompt.match(ROLE_LINE)?.[1] ?? subagentType.split(':').pop() ?? 'agent'

const effortOf = (subagentType: string) => subagentType.match(/worker-(\w+)/)?.[1] ?? '-'

const spentOf = (usage?: {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}) =>
  usage
    ? usage.input_tokens + usage.output_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
    : 0

// The only place that clears the desks and run tokens. The session total and a hidden office stay.
function startRun(isLeadWorking: boolean) {
  const isOff = model.view === 'off'
  wantsPane = !isOff
  change({
    ...EMPTY,
    view: isOff ? 'off' : 'full',
    isActive: true,
    isRunning: true,
    lead: {
      ...EMPTY.lead,
      isWorking: isLeadWorking,
      tool: isLeadWorking ? 'agent-team' : '',
      sessionTokens: model.lead.sessionTokens,
    },
  })
}

function addDesk(e: AgentSpawnInput, started: { agentId?: string; model?: string }) {
  const role = roleOf(e.prompt, e.subagentType)
  const sameRole = model.desks.filter(desk => desk.role === role).length
  const desk: Desk = {
    id: started.agentId as string,
    role,
    label: sameRole > 0 ? `${role} ${sameRole + 1}` : role,
    model: shortModel(started.model ?? e.model ?? ''),
    effort: effortOf(e.subagentType),
    status: 'working',
    tool: 'start',
    tokens: 0,
  }
  change({ ...model, desks: [...model.desks, desk].slice(-24) })
}

function patchDesk(id: string, patch: Partial<Desk>, addTokens: number) {
  if (!model.desks.some(desk => desk.id === id)) return
  change({
    ...model,
    desks: model.desks.map(desk => (desk.id === id ? { ...desk, ...patch, tokens: desk.tokens + addTokens } : desk)),
  })
}

// One tick of the session's timer: the only place that waits on the host.
async function tick($: EngineInterface) {
  if (wantsPane) {
    wantsPane = false
    // Unasked, a pane only opens where it docks as a sidebar.
    if (isFullscreen) await $.ui.open({ id: PANE, title: TITLE }).catch(() => undefined)
  }
  if (wantsRunningCheck && projectDir) {
    wantsRunningCheck = false
    const isRunning = await $.fs.exists(`${projectDir}/.agent-team/RUNNING`).catch(() => model.isRunning)
    if (isRunning !== model.isRunning) change({ ...model, isRunning })
  }
  if (model.isRunning) {
    quietTicks = 0
  } else if (projectDir) {
    // A team started without the skill event leaves only its lock to find.
    const isDue = quietTicks % RUNNING_PROBE_TICKS === 0
    quietTicks += 1
    if (isDue) {
      const isLocked = await $.fs.exists(`${projectDir}/.agent-team/RUNNING`).catch(() => false)
      if (isLocked && !model.isRunning) startRun(false)
    }
  }
  if (isBusy(model)) change({ ...model, frame: (model.frame + 1) % 2 })
  if (version !== published) {
    const target = version
    await update($, office, () => model)
    published = target
  }
}

async function isPaneShown($: EngineInterface) {
  try {
    return (await $.ui.panes()).some(pane => pane.id === PANE && pane.isShown)
  } catch {
    return false
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    projectDir = e.cwd
    // A reload keeps the published office; pick it up again.
    const saved = await read($, office)
    model = saved ? { ...saved, lead: { ...EMPTY.lead, ...saved.lead } } : EMPTY
    await $.command.register({
      name: 'office',
      description: 'Agent office: /office (bigger), /office auto, /office off, /office clear',
      argumentHint: '[full|auto|off|clear]',
      immediate: true,
    })
    $.clock.every(TICK_MS, () => {
      void tick($).catch(() => undefined)
    })
    return next(e)
  })

  // The agent-team skill starting opens the office, as /office would.
  on('skill.prompt', async ($, e, next) => {
    if (/(^|:)agent-team$/.test(e.skill)) startRun(true)
    return next(e)
  })

  // Immediate: runs mid-turn without waiting for or interrupting the turn.
  // Answers with toasts, not text, so nothing reaches the model.
  on('command.run', { command: 'office' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'clear') {
      change({ ...model, desks: [], lead: { ...model.lead, tokens: 0 } })
      $.ui.toast('Agent office cleared')
    } else if (arg === 'off') {
      change({ ...model, view: 'off' as OfficeView })
      await $.ui.close({ id: PANE })
      $.ui.toast('Agent office hidden. /office auto shows it again')
    } else if (arg === 'auto' || arg === 'on') {
      change({ ...model, view: 'auto' as OfficeView })
      $.ui.toast('Agent office: small band above the prompt')
    } else if (e.presentation?.isFullscreen === true) {
      change({ ...model, view: 'auto' as OfficeView })
      await $.ui.open({ id: PANE, title: TITLE })
      $.ui.toast('Agent office docked beside the transcript. Close it with ctrl+x x (Esc during a run interrupts Claude)')
    } else {
      change({ ...model, view: 'full' as OfficeView })
      $.ui.toast('Agent office expanded. /office auto shrinks it, /office off hides it')
    }
    return {}
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.agentId) {
      // The agent is already running: nothing here may fail the hook.
      try {
        // A spawn with a Role: line is the team working, whether or not the skill event came.
        if (hasRoleLine(e.prompt) && !model.isRunning) startRun(true)
        addDesk(e, started)
      } catch {
        // The office is decoration; a missed desk is fine.
      }
    }
    return started
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId) {
      patchDesk(e.agentId, { status: 'working', tool: e.tool }, 0)
    } else {
      change({ ...model, isRunning: model.isRunning || model.isActive, lead: { ...model.lead, isWorking: true, tool: e.tool } })
    }
    return next(e)
  })

  // A prompt the person typed after a finished run takes the band down; the pane keeps the last run.
  on('prompt.submit', async ($, e, next) => {
    const isTyped = e.origin.kind === 'composer' && !e.text.trimStart().startsWith('/')
    if (isTyped && model.isActive && !model.isRunning && !isBusy(model)) change({ ...model, isActive: false })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const spent = spentOf(e.usage)
    if (e.agentId) {
      const status = e.reason === 'answer' ? 'done' : 'failed'
      patchDesk(e.agentId, { status, tool: status }, spent)
    } else {
      // Whether the run is over is known once its RUNNING lock is gone.
      if (model.isActive) wantsRunningCheck = true
      const { lead } = model
      change({
        ...model,
        lead: {
          isWorking: false,
          tool: '',
          tokens: lead.tokens + (model.isActive ? spent : 0),
          sessionTokens: lead.sessionTokens + spent,
        },
      })
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const shown = await read($, office)
    const columns = e.props?.bodyColumns ?? e.viewport?.columns ?? 80
    return bigOffice($.ui.resolve(e), shown, columns)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isFullscreen = e.viewport?.isFullscreen === true
    const shown = await read($, office)
    const isVisible = shown.isActive || shown.desks.some(desk => desk.status === 'working')
    if (e.props.hasSurvey || shown.view === 'off' || !isVisible) return next(e)
    // The docked side pane already shows the office.
    if (await isPaneShown($)) return next(e)

    const parts = $.ui.resolve(e)
    if (shown.view === 'full') return bigOffice(parts, shown, e.props.bodyColumns)
    if (e.props.maxRows < BAND_ROWS + 2) return summaryLine(parts, shown)
    return miniOffice(parts, shown, e.props.bodyColumns)
  })
}

function leadDoing(o: Office) {
  if (o.lead.isWorking) return `> ${o.lead.tool}`
  if (o.desks.some(desk => desk.status === 'working')) return 'waiting for team'
  if (o.isActive) return o.isRunning ? 'thinking' : 'finished'
  return 'idle'
}

function counts(o: Office) {
  const working = o.desks.filter(desk => desk.status === 'working').length
  const done = o.desks.filter(desk => desk.status === 'done').length
  const failed = o.desks.filter(desk => desk.status === 'failed').length
  const team = o.desks.reduce((sum, desk) => sum + desk.tokens, 0) + o.lead.tokens
  return { working, done, failed, team }
}

function summaryLine({ Text }, o: Office) {
  const { working, done, failed, team } = counts(o)
  return (
    <Text dimColor wrap="truncate-end">
      office: {working} working · {done} done{failed > 0 ? ` · ${failed} failed` : ''} · {formatTokens(team)} tok
      (session {formatTokens(o.lead.sessionTokens)}) · main: {leadDoing(o)}
    </Text>
  )
}

function miniOffice(parts, o: Office, columns: number) {
  const { Box, Text } = parts
  const fits = Math.max(0, Math.floor((columns - LEAD_DESK) / MINI_DESK))
  // Busy desks first, then the most recent finished ones.
  const shown = [
    ...o.desks.filter(desk => desk.status === 'working'),
    ...o.desks.filter(desk => desk.status !== 'working').reverse(),
  ].slice(0, fits)
  const hidden = o.desks.length - shown.length
  const half = Math.ceil(shown.length / 2)

  const mini = (desk: Desk) => {
    const sprite =
      desk.status === 'working' ? (o.frame === 0 ? MINI.typingA : MINI.typingB) : MINI[desk.status] ?? MINI.idle
    const doing = desk.status === 'working' ? `>${clip(desk.tool, 5)}` : desk.status === 'done' ? 'ok' : '!!'
    return (
      <Box flexDirection="column" width={MINI_DESK}>
        {sprite.map(line => (
          <Text color={colorFor(desk.status)}>{line}</Text>
        ))}
        <Text bold>{clip(desk.label, MINI_DESK - 1)}</Text>
        <Text dimColor>{clip(`${doing} ${formatTokens(desk.tokens)}`, MINI_DESK - 1)}</Text>
      </Box>
    )
  }

  const leadSprite = o.lead.isWorking ? (o.frame === 0 ? MINI_LEAD.typingA : MINI_LEAD.typingB) : MINI_LEAD.idle

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="center">
        {shown.slice(0, half).map(mini)}
        <Box flexDirection="column" width={LEAD_DESK}>
          {leadSprite.map(line => (
            <Text color="magenta" bold>
              {line}
            </Text>
          ))}
          <Text color="magenta" bold>
            main agent
          </Text>
          <Text dimColor>{clip(leadDoing(o), LEAD_DESK - 1)}</Text>
        </Box>
        {shown.slice(half).map(mini)}
      </Box>
      <Box flexDirection="row" justifyContent="center">
        {summaryLine(parts, o)}
        {hidden > 0 && <Text dimColor> · +{hidden} more (/office)</Text>}
      </Box>
    </Box>
  )
}

function bigOffice(parts, o: Office, columns: number) {
  const { Box, Text } = parts
  const perRow = Math.max(1, Math.floor(columns / (BIG_DESK + 1)))

  const spriteFor = (status: string) =>
    status === 'working' ? (o.frame === 0 ? BIG.typingA : BIG.typingB) : BIG[status] ?? BIG.idle

  const deskBox = (desk: Desk) => (
    <Box flexDirection="column" width={BIG_DESK} borderStyle="round" borderColor={colorFor(desk.status)} paddingX={1}>
      {spriteFor(desk.status).map(line => (
        <Text color={colorFor(desk.status)}>{line}</Text>
      ))}
      <Text bold>{clip(desk.label, BIG_DESK - 4)}</Text>
      <Text dimColor>
        {desk.model} · {desk.effort}
      </Text>
      <Text>
        {desk.status === 'working' ? `> ${clip(desk.tool, 10)}` : desk.status} · {formatTokens(desk.tokens)} tok
      </Text>
    </Box>
  )

  const rows = (group: Desk[]) => {
    const out: Desk[][] = []
    for (let i = 0; i < group.length; i += perRow) out.push(group.slice(i, i + perRow))
    return out.map(row => (
      <Box flexDirection="row" justifyContent="center">
        {row.map(deskBox)}
      </Box>
    ))
  }

  const half = Math.ceil(o.desks.length / 2)
  const { working, done, failed, team } = counts(o)
  const leadSprite = o.lead.isWorking ? (o.frame === 0 ? BIG.typingA : BIG.typingB) : BIG.idle

  return (
    <Box flexDirection="column">
      {rows(o.desks.slice(0, half))}
      <Box flexDirection="row" justifyContent="center">
        <Box flexDirection="column" width={BIG_DESK + 8} borderStyle="double" borderColor="magenta" paddingX={1}>
          {leadSprite.map(line => (
            <Text color="magenta">{line}</Text>
          ))}
          <Text bold>main agent · {formatTokens(o.lead.tokens)} tok</Text>
          <Text dimColor>{clip(`session: ${formatTokens(o.lead.sessionTokens)} tok`, BIG_DESK + 4)}</Text>
          <Text dimColor>{clip(leadDoing(o), BIG_DESK + 4)}</Text>
          <Text>
            {working} working · {done} done{failed > 0 ? ` · ${failed} failed` : ''}
          </Text>
          <Text dimColor>team: {formatTokens(team)} tok</Text>
        </Box>
      </Box>
      {rows(o.desks.slice(half))}
      {o.desks.length === 0 && (
        <Box justifyContent="center">
          <Text dimColor>No run yet. Agents appear here when the team starts.</Text>
        </Box>
      )}
    </Box>
  )
}
