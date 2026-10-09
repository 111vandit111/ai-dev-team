import { expect, mock, test } from 'claude-code/testing'

// The engine beneath the plugin: just enough to start agents, finish turns and draw.
const BAND = { hasSurvey: false, isWorking: true, maxRows: 40, bodyColumns: 120, scroll: { offset: 0, bodyRows: 39 }, view: {} }
const PANE = { title: 'Agent office', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const MAIN_SCREEN = { columns: 120, rows: 50, isFullscreen: false }
const FULLSCREEN = { columns: 160, rows: 50, isFullscreen: true }
const TICK = 400

const usage = (n: number) => ({
  input_tokens: n,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  model: 'claude-sonnet-5-5',
})

async function boot($, on, world = { opened: [] as string[], running: true }) {
  const clock = mock.clock(on)
  let agents = 0
  on('session.start', (_$, e) => ({ cwd: e.cwd, startedAt: 0, context: {}, rateLimits: [] }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('command.run', () => ({ text: 'engine' }))
  on('skill.prompt', (_$, e) => ({ text: e.text }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: `agent-${++agents}` }))
  on('tool.call', () => ({ result: 'ran', text: 'ran' }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.close', () => ({ value: undefined }))
  on('ui.open', (_$, e) => (world.opened.push(e.id), { value: { isPlaced: true } }))
  on('fs.exists', () => ({ value: world.running }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }))
  await $.session.start({ cwd: '/tmp/project', surface: 'terminal', isInteractive: true })
  return { clock, world }
}

const startSkill = $ => $.skill.prompt({ skill: 'ai-dev-team:agent-team', text: 'run the team' })

const spawn = ($, role = 'builder', effort = 'medium') =>
  $.agent.spawn({
    prompt: `Role: ${role}\nRole file: /x/roles/${role}.md`,
    subagentType: `ai-dev-team:worker-${effort}`,
    model: 'sonnet',
    description: role,
  })

const finish = ($, agentId, tokens, reason = 'answer') =>
  $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't', agentId, usage: usage(tokens), reason })

const band = ($, viewport = MAIN_SCREEN, props = BAND) =>
  $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props, viewport })

test('starting an agent passes the spawn through unchanged', async ($, on) => {
  await boot($, on)
  expect(await spawn($)).toEqual({ model: 'claude-sonnet-5-5', agentId: 'agent-1' })
})

test('tool calls pass through unchanged', async ($, on) => {
  await boot($, on)
  expect(await $.tool.call({ tool: 'Bash', command: 'ls' })).toMatchObject({ result: 'ran' })
})

test('the office opens as soon as the agent-team skill starts', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  await clock.advance(TICK)
  const office = await band($)
  expect(await office.find({ text: /main agent/ })).toBeDefined()
  expect(await office.find({ text: /No agents yet/ })).toBeDefined()
})

test('in the fullscreen layout the skill starting docks the side pane', async ($, on) => {
  const { clock, world } = await boot($, on)
  await band($, FULLSCREEN)
  await startSkill($)
  await clock.advance(TICK)
  expect(world.opened).toEqual(['agent-office'])
})

test('on the main screen the side pane never opens by itself', async ($, on) => {
  const { clock, world } = await boot($, on)
  await band($, MAIN_SCREEN)
  await startSkill($)
  await spawn($)
  await clock.advance(TICK * 3)
  expect(world.opened).toEqual([])
})

test('other skills do not open the office', async ($, on) => {
  const { clock } = await boot($, on)
  await $.skill.prompt({ skill: 'commit', text: 'x' })
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /main agent/ })).toBeUndefined()
})

test('working agents are counted while they work', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  await Promise.all([spawn($), spawn($), spawn($, 'verifier')])
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /3 working · 0 done/ })).toBeDefined()
})

test('a burst of simultaneous events loses no update', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  const ids = (await Promise.all([spawn($), spawn($), spawn($), spawn($)])).map(s => s.agentId)
  await Promise.all(ids.flatMap(id => [1, 2, 3].map(() => $.tool.call({ tool: 'Read', file_path: 'a', agentId: id }))))
  await Promise.all(ids.map((id, i) => finish($, id, 1000 * (i + 1))))
  await clock.advance(TICK)
  const office = await band($)
  expect(await office.find({ text: /0 working · 4 done/ })).toBeDefined()
  expect(await office.find({ text: /team: 10\.0k tok/ })).toBeDefined()
})

test('each desk shows its own real tokens', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  const { agentId } = await spawn($)
  await finish($, agentId, 31086)
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /done · 31\.1k tok/ })).toBeDefined()
})

test('the main agent counts its own tokens during a run', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  await finish($, undefined, 2500)
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /main agent · 2\.5k tok/ })).toBeDefined()
})

test('the run shows finished once its lock is gone, and the next prompt clears the office', async ($, on) => {
  const { clock, world } = await boot($, on)
  await startSkill($)
  const { agentId } = await spawn($)
  await finish($, agentId, 1000)
  world.running = false
  await finish($, undefined, 500)
  await clock.advance(TICK * 2)
  expect(await (await band($)).find({ text: /finished/ })).toBeDefined()
  await $.prompt.submit({ text: 'something new', wait: false, origin: { kind: 'composer' } })
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /main agent/ })).toBeUndefined()
})

test('a failed agent shows as failed', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  const { agentId } = await spawn($)
  await finish($, agentId, 100, 'error')
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /1 failed/ })).toBeDefined()
})

test('desks animate while an agent works', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  await spawn($)
  await clock.advance(TICK)
  const office = await band($)
  const before = JSON.stringify(await office.drawn())
  await clock.advance(TICK)
  expect(JSON.stringify(await office.drawn())).not.toBe(before)
})

test('agents started without the skill still show in a small band', async ($, on) => {
  const { clock } = await boot($, on)
  await spawn($)
  await clock.advance(TICK)
  const office = await band($)
  expect(await office.find({ text: /office: 1 working/ })).toBeDefined()
})

test('a short band falls back to one summary line', async ($, on) => {
  const { clock } = await boot($, on)
  await spawn($)
  await clock.advance(TICK)
  const office = await band($, MAIN_SCREEN, { ...BAND, maxRows: 4 })
  expect(await office.find({ text: /office: 1 working/ })).toBeDefined()
  expect(await office.find({ text: /^main agent$/ })).toBeUndefined()
})

test('the side pane draws big desks on every surface', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  await spawn($)
  await clock.advance(TICK)
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'ai-dev-team', surface, component: 'Pane', requestId: 'agent-office', props: PANE })
    expect(await pane.find({ text: /sonnet · medium/ })).toBeDefined()
    await pane.unmount()
  }
})

test('/office on the main screen enlarges the band and tells the model nothing', async ($, on) => {
  const { clock } = await boot($, on)
  await spawn($)
  const ran = await $.command.run({ command: 'office', args: '' })
  expect(ran.text).toBeUndefined()
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /sonnet · medium/ })).toBeDefined()
})

test('/office off hides it', async ($, on) => {
  const { clock } = await boot($, on)
  await startSkill($)
  await $.command.run({ command: 'office', args: 'off' })
  await clock.advance(TICK)
  expect(await (await band($)).find({ text: /main agent/ })).toBeUndefined()
})
