export function RequestState({ status, retry }: { status: 'loading' | 'error' | 'notFound'; retry?: () => void }) {
  if (status === 'loading') return <main className="app-shell page-loading" aria-busy="true" aria-label="Loading business">
    <div className="business-header"><span className="loading-line loading-header" /></div>
    <div className="page-content">
      <span className="loading-line loading-title" />
      <div className="loading-grid">{[0, 1, 2].map((item) => <span key={item} className="loading-card" />)}</div>
      <span className="loading-line loading-title" />
      <span className="loading-line loading-editor" />
    </div>
  </main>

  return <main className="app-shell page-message">
    <h1>{status === 'notFound' ? 'Review page not found' : 'Unable to load this business'}</h1>
    <p>{status === 'notFound' ? 'This review link is invalid or no longer available.' : 'Check your connection and try again.'}</p>
    {status === 'error' && retry && <button type="button" className="page-retry" onClick={retry}>Try again</button>}
  </main>
}
