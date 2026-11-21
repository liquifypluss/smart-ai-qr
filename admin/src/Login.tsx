import { useState, type FormEvent } from 'react'
import { Brand, Icon } from './Icons'
import { adminApi, AdminApiError, type Session } from './api'

export function Login({ onSuccess, notice }: { onSuccess: (value: Session) => void; notice?: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setError(''); setSubmitting(true)
    try { onSuccess(await adminApi.login(email, password, remember)) }
    catch (issue: unknown) {
      setError(issue instanceof AdminApiError && (issue.status === 401 || issue.status === 400) ? 'Invalid email or password.' : issue instanceof AdminApiError && issue.status === 429 ? 'Too many attempts. Please try again later.' : 'Sign in is unavailable. Check your connection and try again.')
    } finally { setSubmitting(false) }
  }

  return <div className="login-page">
    <section className="login-feature" aria-label="AIBawaal administration">
      <Brand />
      <div className="login-story"><div className="login-overline">THE OPERATIONS WORKSPACE</div><h2>Everything in order.<br/>Every business in view.</h2><p>One considered space for the details that matter — businesses, locations, QR experiences and review settings.</p>
        <div className="login-benefits"><div className="login-benefit"><Icon name="buildings"/><span>Manage every client with clarity</span></div><div className="login-benefit"><Icon name="qr"/><span>Keep QR experiences organized</span></div><div className="login-benefit"><Icon name="shield"/><span>Manage client experiences</span></div></div>
      </div>
      <div className="login-feature-foot"><Icon name="lock"/><span>AIBawaal business management</span></div>
    </section>
    <main id="main" className="login-form-region"><div className="login-top"><Icon name="shield"/><span>Admin sign-in</span></div>
      <div className="login-form-wrap"><p className="login-label">ADMINISTRATOR ACCESS</p><h1>Welcome back</h1><p className="login-intro">Sign in to your AIBawaal workspace. This access is reserved for authorized team members.</p>
        <form onSubmit={submit}><div className="login-field"><label htmlFor="admin-email">Work email</label><div className="login-input-wrap"><Icon name="mail"/><input className="login-input" id="admin-email" type="email" placeholder="name@aibawaal.com" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254}/></div></div>
        <div className="login-field"><label htmlFor="admin-password">Password</label><div className="login-input-wrap"><Icon name="lock"/><input className="login-input password" id="admin-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required/><button className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} type="button" onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? 'eye-off' : 'eye'}/></button></div></div>
        <div className="login-options"><label className="checkbox-wrap"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)}/><span>Keep me signed in</span></label><span>AIBawaal team</span></div>
        <button className="btn btn-primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in to workspace'} {!submitting && <Icon name="arrow"/>}</button>
        <p className="login-error" role="alert" aria-live="assertive">{error || notice}</p></form>
        <div className="login-security"><Icon name="shield"/><span>Your session is secured. Signing out ends access on this device.</span></div>
      </div><div className="login-bottom">© AIBawaal</div>
    </main>
  </div>
}
