import { atom, read, update } from 'claude-code'
import type { AgentSpawnInput, EngineInterface, Register } from 'claude-code'

import type { Desk, Lead, OfficeView } from '../types'

// The agent office: every subagent is a person at a desk, the main agent sits at
// the center desk. Drawn from engine events only: no model calls, no tokens.
//
// It shows itself as a band above the prompt, which needs no opening and takes no
// keys, and as a side pane only in the fullscreen layout, where the pane docks
// beside the transcript. It never opens a pane inline on its own: dismissing an
// inline pane with Esc during a run would interrupt the turn and stop every agent.
// Nothing here is awaited before next(e), so it never holds up an agent.

const PANE = 'agent-office'
const TITLE = 'Agent office'
const BIG_DESK = 24
const MINI_DESK = 12
const LEAD_DESK = 14
const BAND_ROWS = 5

const desks = atom({ plugin: 'ai-dev-team', key: 'desks' } as const, [] as Desk[])
const lead = atom({ plugin: 'ai-dev-team', key: 'lead' } as const, { isWorking: false, tool: '' } as Lead)
const frame = atom({ plugin: 'ai-dev-team', key: 'frame' } as const, 0)
const view = atom({ plugin: 'ai-dev-team', key: 'view' } as const, 'auto' as OfficeView)

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

let ticker: { cancel: () => void } | undefined
let isFullscreen = false

const shortModel = (model: string) => model.match(/haiku|sonnet|opus|fable/i)?.[0].toLowerCase() ?? model
const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)
const clip = (text: string, width: number) => (text.length > width ? text.slice(0, width - 1) + '~' : text)
const colorFor = (status: string) => (status === 'working' ? 'yellow' : status === 'done' ? 'green' : 'red')

const roleOf = (prompt: string, subagentType: string) =>
  prompt.match(/^\s*Role:\s*([\w-]+)/m)?.[1] ?? subagentType.split(':').pop() ?? 'agent'

const effortOf = (subagentType: string) => subagentType.match(/worker-(\w+)/)?.[1] ?? '-'

function quietly(work: Promise<unknown>) {
  void work.catch(() => undefined)
}

function trackSpawn($: EngineInterface, e: AgentSpawnInput, started: { agentId?: string; model?: string }) {
  const role = roleOf(e.prompt, e.subagentType)
  quietly(
    update($, desks, list => {
      const sameRole = list.filter(desk => desk.role === role).length
      const desk: Desk = {
        id: started.agentId as string,
        role,
        label: sameRole > 0 ? `${role} ${sameRole + 1}` : role,
        model: shortModel(started.model ?? ''),
        effort: effortOf(e.subagentType),
        status: 'working',
        tool: 'start',
        tokens: 0,
      }
      return [...list, desk].slice(-24)
    }),
  )
  // Unasked, a pane only opens where it docks as a sidebar.
  if (isFullscreen) quietly($.ui.open({ id: PANE, title: TITLE }))
  startTicker($)
}

async function isPaneShown($: EngineInterface) {
  try {
    return (await $.ui.panes()).some(pane => pane.id === PANE && pane.isShown)
  } catch {
    return false
  }
}

function startTicker($: EngineInterface) {
  if (ticker) return
  try {
    ticker = $.clock.every(400, tick($))
  } catch {
    ticker = undefined
  }
}

function tick($: EngineInterface) {
  return async () => {
    const list = await read($, desks)
    const boss = await read($, lead)
    if (!boss.isWorking && !list.some(desk => desk.status === 'working')) {
      ticker?.cancel()
      ticker = undefined
      return
    }
    await update($, frame, n => (n + 1) % 2)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'office',
      description: 'Agent office: /office (bigger), /office auto, /office off, /office clear',
      argumentHint: '[full|auto|off|clear]',
      immediate: true,
    })
    return next(e)
  })

  // Immediate: runs mid-turn without waiting for or interrupting the turn.
  // Answers with toasts, not text, so nothing reaches the model.
  on('command.run', { command: 'office' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'clear') {
      await update($, desks, () => [])
      $.ui.toast('Agent office cleared')
    } else if (arg === 'off') {
      await update($, view, () => 'off' as OfficeView)
      await $.ui.close({ id: PANE })
      $.ui.toast('Agent office hidden. /office auto shows it again')
    } else if (arg === 'auto' || arg === 'on') {
      await update($, view, () => 'auto' as OfficeView)
      $.ui.toast('Agent office: small band above the prompt')
    } else if (e.presentation?.isFullscreen === true) {
      await update($, view, () => 'auto' as OfficeView)
      await $.ui.open({ id: PANE, title: TITLE })
      $.ui.toast('Agent office docked beside the transcript. Close it with ctrl+x x (Esc during a run interrupts Claude)')
    } else {
      await update($, view, () => 'full' as OfficeView)
      $.ui.toast('Agent office expanded. /office auto shrinks it, /office off hides it')
    }
    return {}
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (!started.agentId) return started

    // The agent is already running: nothing below may fail the hook.
    try {
      trackSpawn($, e, started)
    } catch {
      // The office is decoration; a missed desk is fine.
    }
    return started
  })

  on('tool.call', async ($, e, next) => {
    quietly(
      e.agentId
        ? update($, desks, list =>
            list.map(desk => (desk.id === e.agentId ? { ...desk, status: 'working', tool: e.tool } : desk)),
          )
        : update($, lead, () => ({ isWorking: true, tool: e.tool })),
    )
    startTicker($)
    return next(e)
  })

  // A new prompt the person typed starts a fresh office, unless someone is still busy.
  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'composer' && !e.text.trimStart().startsWith('/')) {
      quietly(
        update($, desks, list => (list.some(desk => desk.status === 'working') ? list : [])),
      )
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const usage = e.usage
    const spent = usage
      ? usage.input_tokens + usage.output_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens
      : 0
    if (e.agentId) {
      const status = e.reason === 'answer' ? 'done' : 'failed'
      quietly(
        update($, desks, list =>
          list.map(desk =>
            desk.id === e.agentId ? { ...desk, status, tool: status, tokens: desk.tokens + spent } : desk,
          ),
        ),
      )
    } else {
      quietly(update($, lead, () => ({ isWorking: false, tool: '' })))
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, desks)
    const boss = await read($, lead)
    const tick = await read($, frame)
    const columns = e.props?.bodyColumns ?? e.viewport?.columns ?? 80
    return bigOffice($.ui.resolve(e), list, boss, tick, columns)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isFullscreen = e.viewport?.isFullscreen === true
    const list = await read($, desks)
    const mode = await read($, view)
    if (e.props.hasSurvey || mode === 'off' || list.length === 0) return next(e)

    // The docked side pane already shows the office.
    if (await isPaneShown($)) return next(e)

    const boss = await read($, lead)
    const tick = await read($, frame)
    const parts = $.ui.resolve(e)
    if (mode === 'full') return bigOffice(parts, list, boss, tick, e.props.bodyColumns)
    if (e.props.maxRows < BAND_ROWS + 2) return summaryLine(parts, list, boss)
    return miniOffice(parts, list, boss, tick, e.props.bodyColumns)
  })
}

function summaryLine({ Text }, list: Desk[], boss: Lead) {
  const working = list.filter(desk => desk.status === 'working').length
  const done = list.filter(desk => desk.status === 'done').length
  const failed = list.filter(desk => desk.status === 'failed').length
  const total = list.reduce((sum, desk) => sum + desk.tokens, 0)
  const leadState = boss.isWorking ? `main: ${boss.tool}` : working > 0 ? 'main: waiting for team' : 'main: idle'
  return (
    <Text dimColor>
      office: {working} working · {done} done{failed > 0 ? ` · ${failed} failed` : ''} · {formatTokens(total)} tok ·{' '}
      {leadState}
    </Text>
  )
}

function miniOffice(parts, list: Desk[], boss: Lead, tick: number, columns: number) {
  const { Box, Text } = parts
  const fits = Math.max(0, Math.floor((columns - LEAD_DESK) / MINI_DESK))
  // Busy desks first, then the most recent finished ones.
  const shown = [...list.filter(desk => desk.status === 'working'), ...list.filter(desk => desk.status !== 'working').reverse()]
    .slice(0, fits)
  const hidden = list.length - shown.length
  const half = Math.ceil(shown.length / 2)

  const mini = (desk: Desk) => {
    const sprite = desk.status === 'working' ? (tick === 0 ? MINI.typingA : MINI.typingB) : MINI[desk.status] ?? MINI.idle
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

  const leadSprite = boss.isWorking ? (tick === 0 ? MINI_LEAD.typingA : MINI_LEAD.typingB) : MINI_LEAD.idle
  const leadDoing = boss.isWorking ? `>${clip(boss.tool, 8)}` : shown.some(desk => desk.status === 'working') ? 'waiting' : 'idle'

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
          <Text dimColor>{leadDoing}</Text>
        </Box>
        {shown.slice(half).map(mini)}
      </Box>
      <Box flexDirection="row" justifyContent="center">
        {summaryLine(parts, list, boss)}
        {hidden > 0 && <Text dimColor> · +{hidden} more (/office)</Text>}
      </Box>
    </Box>
  )
}

function bigOffice(parts, list: Desk[], boss: Lead, tick: number, columns: number) {
  const { Box, Text } = parts
  const perRow = Math.max(1, Math.floor(columns / (BIG_DESK + 1)))

  const spriteFor = (status: string) =>
    status === 'working' ? (tick === 0 ? BIG.typingA : BIG.typingB) : BIG[status] ?? BIG.idle

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

  const half = Math.ceil(list.length / 2)
  const working = list.filter(desk => desk.status === 'working').length
  const done = list.filter(desk => desk.status === 'done').length
  const total = list.reduce((sum, desk) => sum + desk.tokens, 0)
  const leadSprite = boss.isWorking ? (tick === 0 ? BIG.typingA : BIG.typingB) : BIG.idle
  const leadDoing = boss.isWorking ? `> ${boss.tool}` : working > 0 ? 'waiting for team' : 'idle'

  return (
    <Box flexDirection="column">
      {rows(list.slice(0, half))}
      <Box flexDirection="row" justifyContent="center">
        <Box flexDirection="column" width={BIG_DESK + 6} borderStyle="double" borderColor="magenta" paddingX={1}>
          {leadSprite.map(line => (
            <Text color="magenta">{line}</Text>
          ))}
          <Text bold>main agent</Text>
          <Text dimColor>{leadDoing}</Text>
          <Text>
            {working} working · {done} done
          </Text>
          <Text dimColor>team: {formatTokens(total)} tok</Text>
        </Box>
      </Box>
      {rows(list.slice(half))}
      {list.length === 0 && (
        <Box justifyContent="center">
          <Text dimColor>No agents yet. They appear here when the team starts.</Text>
        </Box>
      )}
    </Box>
  )
}
