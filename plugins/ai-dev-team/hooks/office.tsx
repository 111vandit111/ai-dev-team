import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Desk, Lead } from '../types'

// Draws the agent team as an office: every subagent is a person at a desk,
// the main agent sits at the center desk. Pure hooks, no model calls.

const PANE = 'agent-office'
const TITLE = 'Agent office'
const DESK_WIDTH = 24

const desks = atom({ plugin: 'ai-dev-team', key: 'desks' } as const, [] as Desk[])
const lead = atom({ plugin: 'ai-dev-team', key: 'lead' } as const, { isWorking: false, tool: '' } as Lead)
const frame = atom({ plugin: 'ai-dev-team', key: 'frame' } as const, 0)

const SPRITES = {
  typingA: [' o   .----.', '/|\\_ |=== |', '/ \\  \'----\''],
  typingB: [' o   .----.', '/|_/ |==  |', '/ \\  \'----\''],
  done: [' o/  .----.', '/|   | ok |', '/ \\  \'----\''],
  failed: [' o   .----.', '/|\\  | !! |', '/ \\  \'----\''],
  idle: [' o   .----.', '/|\\  |    |', '/ \\  \'----\''],
}

let ticker: { cancel: () => void } | undefined

const shortModel = (model: string) => model.match(/haiku|sonnet|opus|fable/i)?.[0].toLowerCase() ?? model
const formatTokens = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

const roleOf = (prompt: string, subagentType: string) =>
  prompt.match(/^\s*Role:\s*([\w-]+)/m)?.[1] ?? subagentType.split(':').pop() ?? 'agent'

const effortOf = (subagentType: string) => subagentType.match(/worker-(\w+)/)?.[1] ?? '-'

function startTicker($: EngineInterface) {
  if (ticker) return
  ticker = $.clock.every(400, async () => {
    const list = await read($, desks)
    const boss = await read($, lead)
    if (!boss.isWorking && !list.some(desk => desk.status === 'working')) {
      ticker?.cancel()
      ticker = undefined
      return
    }
    await update($, frame, n => (n + 1) % 2)
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'office', description: 'Show the agent office pane (add "clear" to empty it)' })
    return next(e)
  })

  on('command.run', { command: 'office' }, async ($, e) => {
    if (e.args?.trim() === 'clear') {
      await update($, desks, () => [])
      return { text: 'Agent office cleared.' }
    }
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Agent office opened.' }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (!started.agentId) return started

    const role = roleOf(e.prompt, e.subagentType)
    void update($, desks, list => {
      const sameRole = list.filter(desk => desk.role === role).length
      const desk: Desk = {
        id: started.agentId as string,
        role,
        label: sameRole > 0 ? `${role} ${sameRole + 1}` : role,
        model: shortModel(started.model),
        effort: effortOf(e.subagentType),
        status: 'working',
        tool: 'starting',
        tokens: 0,
      }
      return [...list, desk].slice(-24)
    }).catch(() => undefined)
    void $.ui.open({ id: PANE, title: TITLE }).catch(() => undefined)
    startTicker($)
    return started
  })

  on('tool.call', async ($, e, next) => {
    // The office must never slow down or block a tool call, so its writes are fire-and-forget.
    const write = e.agentId
      ? update($, desks, list =>
          list.map(desk => (desk.id === e.agentId ? { ...desk, status: 'working', tool: e.tool } : desk)),
        )
      : update($, lead, () => ({ isWorking: true, tool: e.tool }))
    void write.catch(() => undefined)
    startTicker($)
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    // A new user prompt with nobody busy starts a fresh office.
    if (e.text) {
      const list = await read($, desks)
      if (!list.some(desk => desk.status === 'working')) await update($, desks, () => [])
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
      await update($, desks, list =>
        list.map(desk =>
          desk.id === e.agentId ? { ...desk, status, tool: status, tokens: desk.tokens + spent } : desk,
        ),
      )
    } else {
      await update($, lead, () => ({ isWorking: false, tool: '' }))
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, desks)
    const boss = await read($, lead)
    const tick = await read($, frame)
    const columns = e.viewport?.columns ?? 80
    const perRow = Math.max(1, Math.floor(columns / (DESK_WIDTH + 1)))

    const spriteFor = (status: string) =>
      status === 'working' ? (tick === 0 ? SPRITES.typingA : SPRITES.typingB) : SPRITES[status] ?? SPRITES.idle
    const colorFor = (status: string) => (status === 'working' ? 'yellow' : status === 'done' ? 'green' : 'red')

    const deskBox = (desk: Desk) => (
      <Box flexDirection="column" width={DESK_WIDTH} borderStyle="round" borderColor={colorFor(desk.status)} paddingX={1}>
        {spriteFor(desk.status).map(line => (
          <Text color={colorFor(desk.status)}>{line}</Text>
        ))}
        <Text bold>{desk.label}</Text>
        <Text dimColor>
          {desk.model} · {desk.effort}
        </Text>
        <Text>
          {desk.status === 'working' ? `> ${desk.tool}` : desk.status} · {formatTokens(desk.tokens)} tok
        </Text>
      </Box>
    )

    const rows = (group: Desk[]) => {
      const out: Desk[][] = []
      for (let i = 0; i < group.length; i += perRow) out.push(group.slice(i, i + perRow))
      return out.map(row => <Box flexDirection="row" justifyContent="center">{row.map(deskBox)}</Box>)
    }

    const half = Math.ceil(list.length / 2)
    const working = list.filter(desk => desk.status === 'working').length
    const done = list.filter(desk => desk.status === 'done').length
    const total = list.reduce((sum, desk) => sum + desk.tokens, 0)
    const leadSprite = boss.isWorking ? (tick === 0 ? SPRITES.typingA : SPRITES.typingB) : SPRITES.idle

    return (
      <Box flexDirection="column">
        {rows(list.slice(0, half))}
        <Box flexDirection="row" justifyContent="center">
          <Box flexDirection="column" width={DESK_WIDTH + 6} borderStyle="double" borderColor="magenta" paddingX={1}>
            {leadSprite.map(line => (
              <Text color="magenta">{line}</Text>
            ))}
            <Text bold>main agent</Text>
            <Text dimColor>{boss.isWorking ? `> ${boss.tool}` : 'idle'}</Text>
            <Text>
              {working} working · {done} done
            </Text>
            <Text dimColor>team: {formatTokens(total)} tok</Text>
          </Box>
        </Box>
        {rows(list.slice(half))}
        {list.length === 0 && (
          <Box justifyContent="center">
            <Text dimColor>No agents yet — they appear here when the team starts.</Text>
          </Box>
        )}
      </Box>
    )
  })
}
