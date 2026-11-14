export async function copyReview(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return copyWithSelection(text)
    }
  }
  return copyWithSelection(text)
}

function copyWithSelection(text: string): boolean {
  const el = document.createElement('textarea')
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  el.value = text
  el.setAttribute('readonly', '')
  el.style.cssText = 'position:fixed;inset:0;opacity:0;pointer-events:none'
  document.body.append(el)
  el.focus()
  el.select()
  el.setSelectionRange(0, el.value.length)
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  el.remove()
  previousFocus?.focus({ preventScroll: true })
  return copied
}

export function validReviewDestination(raw: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
