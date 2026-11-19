const menuButton = document.querySelector('.menu-toggle')
const sidebar = document.querySelector('.sidebar')
const backdrop = document.querySelector('.backdrop')
let previousFocus = null

function closeMenu() {
  if (!sidebar) return
  sidebar.classList.remove('is-open')
  backdrop?.classList.remove('is-open')
  menuButton?.setAttribute('aria-expanded', 'false')
  document.body.style.overflow = ''
  if (previousFocus instanceof HTMLElement) previousFocus.focus()
}

menuButton?.addEventListener('click', () => {
  previousFocus = document.activeElement
  sidebar?.classList.add('is-open')
  backdrop?.classList.add('is-open')
  menuButton.setAttribute('aria-expanded', 'true')
  document.body.style.overflow = 'hidden'
  sidebar?.querySelector('a')?.focus()
})
backdrop?.addEventListener('click', closeMenu)
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && sidebar?.classList.contains('is-open')) closeMenu()
  if (event.key !== 'Tab' || !sidebar?.classList.contains('is-open')) return
  const items = [...sidebar.querySelectorAll('a,button')].filter((element) => element instanceof HTMLElement && element.offsetParent !== null)
  const first = items[0]
  const last = items.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
})

const passwordField = document.querySelector('#password')
const passwordToggle = document.querySelector('.password-toggle')
passwordToggle?.addEventListener('click', () => {
  const visible = passwordField.type === 'password'
  passwordField.type = visible ? 'text' : 'password'
  passwordToggle.setAttribute('aria-pressed', String(visible))
  passwordToggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password')
})

document.querySelector('#login-demo')?.addEventListener('submit', (event) => {
  event.preventDefault()
  document.querySelector('#form-notice').textContent = 'Design preview only — authentication is not connected.'
})

const search = document.querySelector('#business-search')
const status = document.querySelector('#business-status')
const category = document.querySelector('#business-category')
function filterRows() {
  const query = search.value.trim().toLowerCase()
  let visible = 0
  document.querySelectorAll('[data-business-row]').forEach((row) => {
    const matches = row.dataset.search.includes(query) && (status.value === 'all' || row.dataset.status === status.value) && (category.value === 'all' || row.dataset.category === category.value)
    row.hidden = !matches
    if (matches) visible += 1
  })
  document.querySelector('#business-results').textContent = `${visible} demo businesses`
  document.querySelector('#pagination-label').textContent = `Showing ${visible} example records · no real data`
}
for (const element of [search, status, category]) element?.addEventListener(element === search ? 'input' : 'change', filterRows)

document.querySelectorAll('[data-demo-action]').forEach((button) => button.addEventListener('click', () => {
  const notice = document.querySelector('.note-panel span')
  if (notice) notice.textContent = `${button.dataset.demoAction} is a visual preview only. No business records are changed.`
}))
