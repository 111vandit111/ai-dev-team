import { expect, mock, test } from 'claude-code/testing'

// The engine beneath the plugin: just enough to start one agent and draw.
const BAND = { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { offset: 0, bodyRows: 19 }, view: {} }
const PANE = { title: 'Agent office', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} }
const MAIN_SCREEN = { columns: 100, rows: 40, isFullscreen: false }

const USAGE = {
  input_tokens: 1000,
  output_tokens: 200,
  cache_read_input_tokens: 500,
  cache_creation_input_tokens: 0,
  model: 'claude-sonnet-5-5',
}

function engine(on, opened: string[] = []) {
  const clock = mock.clock(on)
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'agent-1' }))
  on('tool.call', () => ({ result: 'ran', text: 'ran' }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('ui.panes', () => ({ value: [] }))
  on('ui.open', (_$, e) => (opened.push(e.id), { value: { isPlaced: true } }))
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', props: {}, children: [] }))
  return clock
}

async function spawnBuilder($) {
  return $.agent.spawn({
    prompt: 'Role: builder\nRole file: /x/roles/builder.md',
    subagentType: 'ai-dev-team:worker-medium',
    model: 'sonnet',
    description: 'build the page',
  })
}

test('starting an agent passes the spawn through unchanged', async ($, on) => {
  engine(on)
  const started = await spawnBuilder($)
  expect(started).toEqual({ model: 'claude-sonnet-5-5', agentId: 'agent-1' })
})

test('tool calls pass through unchanged', async ($, on) => {
  engine(on)
  const ran = await $.tool.call({ tool: 'Bash', command: 'ls' })
  expect(ran).toMatchObject({ result: 'ran' })
})

test('the band shows the agent and the main agent once an agent starts', async ($, on) => {
  const clock = engine(on)
  await spawnBuilder($)
  await clock.settle()
  const band = await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: MAIN_SCREEN })
  expect(await band.find({ text: /builder/ })).toBeDefined()
  expect(await band.find({ text: /main agent/ })).toBeDefined()
  expect(await band.find({ text: /1 working/ })).toBeDefined()
})

test('a finished agent shows done with its real tokens', async ($, on) => {
  const clock = engine(on)
  await spawnBuilder($)
  await clock.settle()
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', agentId: 'agent-1', usage: USAGE, reason: 'answer' })
  await clock.settle()
  const band = await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: MAIN_SCREEN })
  expect(await band.find({ text: /1 done/ })).toBeDefined()
  expect(await band.find({ text: /1\.7k tok/ })).toBeDefined()
})

test('with no agents the band leaves the engine its own row', async ($, on) => {
  engine(on)
  const band = await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: MAIN_SCREEN })
  expect(await band.find({ text: /main agent/ })).toBeUndefined()
})

test('the side pane draws big desks on every surface', async ($, on) => {
  const clock = engine(on)
  await spawnBuilder($)
  await clock.settle()
  for (const surface of ['terminal', 'desktop'] as const) {
    const pane = await $.ui.mount({ plugin: 'ai-dev-team', surface, component: 'Pane', requestId: 'agent-office', props: PANE })
    expect(await pane.find({ text: /sonnet · medium/ })).toBeDefined()
    await pane.unmount()
  }
})

test('desks animate while an agent works', async ($, on) => {
  const clock = engine(on)
  await spawnBuilder($)
  await clock.settle()
  const band = await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: MAIN_SCREEN })
  const before = JSON.stringify(await band.drawn())
  await clock.advance(400)
  const after = JSON.stringify(await band.drawn())
  expect(after).not.toBe(before)
})

test('a narrow band falls back to one summary line', async ($, on) => {
  const clock = engine(on)
  await spawnBuilder($)
  await clock.settle()
  const band = await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, maxRows: 4 }, viewport: MAIN_SCREEN })
  expect(await band.find({ text: /office: 1 working/ })).toBeDefined()
  expect(await band.find({ text: /^main agent$/ })).toBeUndefined()
})

test('the side pane never opens by itself on the main screen', async ($, on) => {
  const opened: string[] = []
  const clock = engine(on, opened)
  await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: MAIN_SCREEN })
  await spawnBuilder($)
  await clock.settle()
  expect(opened).toEqual([])
})

test('the side pane opens by itself in the fullscreen layout', async ($, on) => {
  const opened: string[] = []
  const clock = engine(on, opened)
  await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: { ...MAIN_SCREEN, isFullscreen: true } })
  await spawnBuilder($)
  await clock.settle()
  expect(opened).toEqual(['agent-office'])
})

test('/office enlarges the band on the main screen and tells the model nothing', async ($, on) => {
  const clock = engine(on)
  on('session.start', (_$, e) => ({ cwd: e.cwd, startedAt: 0, context: {}, rateLimits: [] }))
  on('command.register', (_$, e) => ({ value: { command: e.name } }))
  on('ui.toast', () => ({ value: undefined }))
  on('command.run', () => ({ text: 'engine' }))
  await $.session.start({ cwd: '/tmp/project', surface: 'terminal', isInteractive: true })
  await spawnBuilder($)
  await clock.settle()
  const ran = await $.command.run({ command: 'office', args: '' })
  expect(ran.text).toBeUndefined()
  const band = await $.ui.mount({ plugin: 'ai-dev-team', surface: 'terminal', component: 'AbovePrompt', props: BAND, viewport: MAIN_SCREEN })
  expect(await band.find({ text: /sonnet · medium/ })).toBeDefined()
})
