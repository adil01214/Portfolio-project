import { useEffect, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowUpRight, BriefcaseBusiness, Check,
  ChevronDown, FileText, FolderKanban, Image, LayoutDashboard, LogOut, Mail,
  Pencil, Plus, Save, Send, Settings2, ShieldCheck, Sparkles, Trash2, UserRound,
  UsersRound, Wrench, X,
} from 'lucide-react'
import { api, API_URL } from './api'

const collections = {
  skills: { label: 'Skills', icon: Wrench },
  projects: { label: 'Projects', icon: FolderKanban },
  blogs: { label: 'Blogs', icon: FileText },
  experience: { label: 'Experience', icon: BriefcaseBusiness },
  testimonials: { label: 'Testimonials', icon: UsersRound },
  services: { label: 'Services', icon: Sparkles },
}

const navItems = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'about', label: 'About', icon: UserRound },
  ...Object.entries(collections).map(([key, value]) => ({ key, ...value })),
  { key: 'messages', label: 'Messages', icon: Mail },
  { key: 'media', label: 'Media library', icon: Image },
]

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await api('/auth/login', { method: 'POST', body: { email, password } })
      const session = { accessToken: result.access_token, refreshToken: result.refresh_token, user: result.user }
      localStorage.setItem('portfolio-cms-auth', JSON.stringify(session))
      onLogin(session)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }
  return <main className="login-screen">
    <aside className="login-art"><a className="brand inverse" href="/"><span>p.</span> Portfolio CMS</a><div className="login-art-copy"><span className="kicker">YOUR WORK, IN GOOD ORDER</span><h1>Make it<br />yours.</h1><p>A quiet place to keep the work moving.</p></div><span className="login-footnote">CONTENT STUDIO / 01</span></aside>
    <section className="login-panel"><div className="login-panel-inner"><span className="login-mark"><ShieldCheck size={20} /></span><p className="kicker">ADMINISTRATOR ACCESS</p><h2>Welcome back.</h2><p className="login-subtitle">Sign in to update your portfolio.</p>
      <form onSubmit={submit} className="login-form"><label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="inline-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowUpRight size={16} /></button></form>
    </div><span className="login-version">PORTFOLIO CMS / SECURE SESSION</span></section>
  </main>
}

function ContentEditor({ initial, onClose, onSave, busy }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [slug, setSlug] = useState(initial?.slug || '')
  const [summary, setSummary] = useState(initial?.summary || '')
  const [data, setData] = useState(JSON.stringify(initial?.data || {}, null, 2))
  const [published, setPublished] = useState(initial?.is_published ?? true)
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    try {
      const parsed = JSON.parse(data || '{}')
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Enter a JSON object.')
      setError('')
      onSave({ title, slug, summary, data: parsed, is_published: published })
    } catch (parseError) {
      setError(parseError.message || 'Content must be valid JSON.')
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header className="modal-header"><div><p className="kicker">CONTENT EDITOR</p><h2 id="editor-title">{initial ? 'Edit entry' : 'New entry'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close editor"><X size={19} /></button></header>
      <form className="editor-form" onSubmit={submit}><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="160" required /></label><label>URL slug<input value={slug} onChange={(event) => setSlug(event.target.value)} maxLength="180" placeholder="Generated from title when empty" /></label><label>Summary<textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows="2" maxLength="500" /></label><label>Additional content <span className="field-hint">JSON fields used by the portfolio, e.g. description, image_url, url, category.</span><textarea className="json-input" value={data} onChange={(event) => setData(event.target.value)} rows="9" spellCheck="false" /></label><label className="check-label"><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Published on portfolio</label>{error && <p className="inline-error" role="alert">{error}</p>}<footer className="modal-actions"><button type="button" className="quiet-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save entry'} <Save size={15} /></button></footer></form>
    </section>
  </div>
}

function AboutEditor({ value, onSave, busy }) {
  const [text, setText] = useState(JSON.stringify(value || {}, null, 2))
  const [error, setError] = useState('')
  useEffect(() => setText(JSON.stringify(value || {}, null, 2)), [value])
  const submit = (event) => {
    event.preventDefault()
    try {
      const data = JSON.parse(text)
      if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Enter a JSON object.')
      setError('')
      onSave(data)
    } catch (parseError) {
      setError(parseError.message || 'Content must be valid JSON.')
    }
  }
  return <form className="about-editor" onSubmit={submit}><div className="form-intro"><p className="kicker">PROFILE DETAILS</p><h2>About content</h2><p>Update the profile shown at the top of your public portfolio.</p></div><label>Profile fields <span className="field-hint">Supported fields include name, headline, bio, location, email, website, image_url.</span><textarea className="json-input about-json" value={text} onChange={(event) => setText(event.target.value)} rows="14" spellCheck="false" /></label>{error && <p className="inline-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save profile'} <Save size={15} /></button></form>
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('portfolio-cms-auth') || 'null')
    } catch {
      localStorage.removeItem('portfolio-cms-auth')
      return null
    }
  })
  const [authenticated, setAuthenticated] = useState(false)
  const [section, setSection] = useState('overview')
  const [records, setRecords] = useState(null)
  const [profile, setProfile] = useState({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState(null)
  const [uploadBusy, setUploadBusy] = useState(false)

  const logout = () => {
    localStorage.removeItem('portfolio-cms-auth')
    setSession(null)
    setAuthenticated(false)
    setRecords(null)
    setSection('overview')
  }

  useEffect(() => {
    const expire = () => logout()
    window.addEventListener('cms-session-expired', expire)
    if (!session) return () => window.removeEventListener('cms-session-expired', expire)
    api('/auth/me').then((user) => {
      setSession((previous) => ({ ...previous, user }))
      setAuthenticated(true)
    }).catch(() => logout())
    return () => window.removeEventListener('cms-session-expired', expire)
  }, [])

  const loadSection = async (nextSection = section) => {
    setLoading(true)
    setError('')
    try {
      if (nextSection === 'overview') {
        const keys = Object.keys(collections)
        const values = await Promise.all([...keys.map((key) => api(`/${key}`)), api('/messages')])
        setRecords(Object.fromEntries([...keys.map((key, index) => [key, values[index]]), ['messages', values.at(-1)]]))
      } else if (nextSection === 'about') {
        setProfile(await api('/about'))
      } else {
        const result = await api(nextSection === 'media' ? '/media' : `/${nextSection}${collections[nextSection] ? '?all=1' : ''}`)
        setRecords((previous) => ({ ...previous, [nextSection]: result }))
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticated) loadSection(section)
  }, [authenticated, section])

  const saveContent = async (payload) => {
    setBusy(true)
    try {
      const path = `/${section}${editor?.record?.id ? `/${editor.record.id}` : ''}`
      await api(path, { method: editor?.record?.id ? 'PUT' : 'POST', body: payload })
      setEditor(null)
      setNotice(`${collections[section].label} saved.`)
      await loadSection(section)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const removeRecord = async (path, label) => {
    if (!window.confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) return
    try {
      await api(path, { method: 'DELETE' })
      setNotice(`${label} deleted.`)
      await loadSection(section)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const saveAbout = async (data) => {
    setBusy(true)
    try {
      setProfile(await api('/about', { method: 'PUT', body: { data } }))
      setNotice('Profile saved.')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  const uploadImage = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      await api('/upload/image', { method: 'POST', body })
      setNotice('Image uploaded.')
      await loadSection('media')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setUploadBusy(false)
      event.target.value = ''
    }
  }

  const editMedia = async (item) => {
    const name = window.prompt('Media label', item.original_filename)
    if (!name || name === item.original_filename) return
    try {
      await api(`/media/${item.id}`, { method: 'PUT', body: { original_filename: name } })
      setNotice('Media label updated.')
      await loadSection('media')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  if (!authenticated) return <Login onLogin={(nextSession) => { setSession(nextSession); setAuthenticated(true) }} />

  const current = navItems.find((item) => item.key === section) || navItems[0]
  const sectionRecords = records?.[section] || []
  const dataCount = Object.keys(collections).reduce((total, key) => total + (records?.[key]?.length || 0), 0)

  return <div className="admin-shell">
    <aside className="sidebar"><a className="brand" href="#overview"><span>p.</span> Portfolio CMS</a><div className="workspace-tag"><span className="workspace-dot" /> CONTENT STUDIO</div><nav className="side-nav" aria-label="CMS navigation">{navItems.map(({ key, label, icon: Icon }) => <button key={key} className={section === key ? 'nav-item active' : 'nav-item'} onClick={() => { setSection(key); setNotice('') }}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{key === 'messages' && records?.messages?.length > 0 && <span className="nav-count">{records.messages.filter((message) => message.status === 'new').length || ''}</span>}</button>)}</nav><div className="sidebar-bottom"><div className="user-chip"><span className="avatar">{session?.user?.email?.slice(0, 1).toUpperCase() || 'A'}</span><div><strong>{session?.user?.email || 'Administrator'}</strong><small>Administrator</small></div></div><button className="signout-button" onClick={logout}><LogOut size={16} /> Sign out</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{current.label}</strong></div><div className="top-actions"><a className="view-site" href={import.meta.env.VITE_SITE_URL || 'http://localhost:5173'} target="_blank" rel="noreferrer">View site <ArrowUpRight size={14} /></a><span className="admin-avatar"><Activity size={16} /></span></div></header>
      <div className="page-content"><div className="page-title-row"><div><p className="kicker">CONTENT STUDIO / {String(navItems.findIndex((item) => item.key === section) + 1).padStart(2, '0')}</p><h1>{current.label}</h1><p className="page-subtitle">{section === 'overview' ? 'A clear view of your portfolio content.' : section === 'about' ? 'The profile and introduction shown on your public site.' : section === 'messages' ? 'Notes sent through your public contact form.' : section === 'media' ? 'Images available to reuse across your portfolio.' : `Manage published ${current.label.toLowerCase()} and drafts.`}</p></div>{collections[section] && <button className="primary-button compact" onClick={() => setEditor({ record: null })}><Plus size={16} /> Add {current.label.replace(/s$/, '').toLowerCase()}</button>}</div>
        {notice && <div className="notice success" role="status"><Check size={16} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}{error && <div className="notice error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
        {loading && <div className="state-panel"><span className="spinner" />Loading content…</div>}
        {!loading && section === 'overview' && <section className="overview-view"><div className="stat-grid"><article className="stat-panel"><span className="stat-icon green"><FolderKanban size={17} /></span><p>Published content</p><strong>{dataCount}</strong><small>Across six collections</small></article><article className="stat-panel"><span className="stat-icon lime"><Mail size={17} /></span><p>Inbox</p><strong>{records?.messages?.length || 0}</strong><small>{records?.messages?.filter((item) => item.status === 'new').length || 0} unread messages</small></article><article className="stat-panel"><span className="stat-icon soft"><Image size={17} /></span><p>Quick access</p><strong>Media</strong><small>Manage your image library</small><button className="stat-link" onClick={() => setSection('media')}>Open library <ArrowUpRight size={13} /></button></article></div><div className="overview-lower"><section className="overview-table"><div className="subsection-title"><div><p className="kicker">LATEST ENTRIES</p><h2>Recently updated</h2></div></div>{dataCount === 0 ? <EmptyState message="Your portfolio content will appear here once you add it." /> : <div className="table-wrap"><table><thead><tr><th>Collection</th><th>Entries</th><th>Latest title</th><th /></tr></thead><tbody>{Object.entries(collections).map(([key, item]) => <tr key={key}><td>{item.label}</td><td>{records?.[key]?.length || 0}</td><td>{records?.[key]?.[0]?.title || '—'}</td><td><button className="row-action" onClick={() => setSection(key)} aria-label={`Manage ${item.label}`}><ArrowUpRight size={15} /></button></td></tr>)}</tbody></table></div>}</section><section className="recent-messages"><div className="subsection-title"><div><p className="kicker">INCOMING</p><h2>Recent messages</h2></div><button className="text-button" onClick={() => setSection('messages')}>View inbox <ArrowUpRight size={13} /></button></div>{records?.messages?.length ? records.messages.slice(0, 3).map((message) => <button className="message-preview" key={message.id} onClick={() => setSection('messages')}><span className="message-preview-top"><strong>{message.name}</strong><time>{new Date(message.created_at).toLocaleDateString()}</time></span><span>{message.subject}</span></button>) : <EmptyState message="No messages yet." />}</section></div></section>}
        {!loading && section === 'about' && <AboutEditor value={profile} onSave={saveAbout} busy={busy} />}
        {!loading && collections[section] && <section className="records-panel"><div className="panel-toolbar"><span>{sectionRecords.length} {sectionRecords.length === 1 ? 'entry' : 'entries'}</span><span className="visibility-key"><span /> Published <span className="draft-dot" /> Draft</span></div>{sectionRecords.length === 0 ? <EmptyState message={`No ${current.label.toLowerCase()} yet.`} action="Add the first entry" onAction={() => setEditor({ record: null })} /> : <div className="table-wrap"><table><thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{sectionRecords.map((record) => <tr key={record.id}><td><strong>{record.title}</strong><small className="table-summary">{record.summary || 'No summary'}</small></td><td><code>/{record.slug}</code></td><td><span className={record.is_published ? 'status published' : 'status draft'}>{record.is_published ? 'Published' : 'Draft'}</span></td><td>{new Date(record.updated_at).toLocaleDateString()}</td><td className="row-actions"><button className="row-action" onClick={() => setEditor({ record })} aria-label={`Edit ${record.title}`}><Pencil size={15} /></button><button className="row-action danger-action" onClick={() => removeRecord(`/${section}/${record.id}`, current.label.slice(0, -1))} aria-label={`Delete ${record.title}`}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}</section>}
        {!loading && section === 'messages' && <section className="records-panel"><div className="panel-toolbar"><span>{sectionRecords.length} messages</span><span>Messages are stored privately in the database.</span></div>{sectionRecords.length === 0 ? <EmptyState message="Your inbox is clear." /> : <div className="table-wrap"><table><thead><tr><th>From</th><th>Subject & message</th><th>Received</th><th>Status</th><th /></tr></thead><tbody>{sectionRecords.map((message) => <tr key={message.id}><td><strong>{message.name}</strong><small className="table-summary">{message.email}</small></td><td><strong>{message.subject}</strong><small className="table-summary message-body">{message.message}</small></td><td>{new Date(message.created_at).toLocaleDateString()}</td><td><select className="status-select" aria-label={`Status for ${message.name}`} value={message.status} onChange={async (event) => { try { await api(`/messages/${message.id}`, { method: 'PUT', body: { status: event.target.value } }); await loadSection('messages') } catch (requestError) { setError(requestError.message) } }}><option value="new">New</option><option value="read">Read</option><option value="archived">Archived</option></select></td><td><button className="row-action danger-action" onClick={() => removeRecord(`/messages/${message.id}`, 'Message')} aria-label={`Delete message from ${message.name}`}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}</section>}
        {!loading && section === 'media' && <section className="media-view"><div className="upload-strip"><div className="upload-symbol"><ArrowDownToLine size={19} /></div><div><strong>Add an image</strong><p>JPG, PNG, GIF or WebP · up to 5 MB</p></div><label className="secondary-button">{uploadBusy ? 'Uploading…' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={uploadImage} disabled={uploadBusy} /></label></div>{sectionRecords.length === 0 ? <EmptyState message="Uploaded images will appear in this library." /> : <div className="media-grid">{sectionRecords.map((item) => <article className="media-item" key={item.id}><img src={item.url.startsWith('http') ? item.url : `${API_URL}${item.url}`} alt={item.original_filename} loading="lazy" /><div className="media-item-info"><strong title={item.original_filename}>{item.original_filename}</strong><span>{(item.size / 1024).toFixed(0)} KB</span></div><div className="media-item-actions"><button className="text-button" onClick={() => navigator.clipboard.writeText(item.url.startsWith('http') ? item.url : `${API_URL}${item.url}`)}>Copy URL</button><button className="row-action" onClick={() => editMedia(item)} aria-label={`Rename ${item.original_filename}`}><Pencil size={14} /></button><button className="row-action danger-action" onClick={() => removeRecord(`/media/${item.id}`, 'Image')} aria-label={`Delete ${item.original_filename}`}><Trash2 size={14} /></button></div></article>)}</div>}</section>}
        {!loading && error === '' && !['overview', 'about', 'media', 'messages'].includes(section) && !collections[section] && <EmptyState message="This section is not available." />}
        <footer className="content-footer"><span><Settings2 size={14} /> Content changes are saved to your database.</span><span>PORTFOLIO CMS / V1</span></footer>
      </div>
    </main>
    {editor && <ContentEditor initial={editor.record} onClose={() => setEditor(null)} onSave={saveContent} busy={busy} />}
  </div>
}

function EmptyState({ message, action, onAction }) {
  return <div className="empty-state"><span><FolderKanban size={19} /></span><p>{message}</p>{action && <button className="text-button" onClick={onAction}>{action} <ArrowUpRight size={13} /></button>}</div>
}
