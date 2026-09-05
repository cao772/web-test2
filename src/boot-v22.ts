const root = document.documentElement
root.dataset.appBoot = 'loading'

function formatError(value: unknown) {
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack ?? ''}`.trim()
  if (typeof value === 'string') return value
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

function showBootError(value: unknown) {
  const detail = formatError(value)
  root.dataset.appBoot = 'failed'
  console.error('[BOOT] V22 startup failed', value)

  let panel = document.querySelector<HTMLElement>('#bootError')
  if (!panel) {
    panel = document.createElement('section')
    panel.id = 'bootError'
    panel.setAttribute('role', 'alert')
    Object.assign(panel.style, {
      position: 'fixed',
      zIndex: '99999',
      top: '16px',
      right: '16px',
      width: 'min(560px, calc(100vw - 32px))',
      maxHeight: '70vh',
      overflow: 'auto',
      padding: '14px 16px',
      borderRadius: '14px',
      background: 'rgba(72, 31, 31, .94)',
      color: '#fff7f0',
      border: '1px solid rgba(255,255,255,.2)',
      boxShadow: '0 18px 50px rgba(0,0,0,.25)',
      font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    })
    document.body.append(panel)
  }
  panel.textContent = `V22 启动失败\n\n${detail}`
}

window.addEventListener('error', event => {
  if (root.dataset.appBoot !== 'ready') showBootError(event.error ?? event.message)
})
window.addEventListener('unhandledrejection', event => {
  if (root.dataset.appBoot !== 'ready') showBootError(event.reason)
})

console.info('[BOOT] loading main-v22')
void import('./main-v22')
  .then(() => {
    root.dataset.appBoot = 'ready'
    console.info('[BOOT] main-v22 ready')
    document.querySelector('#bootError')?.remove()
  })
  .catch(showBootError)
