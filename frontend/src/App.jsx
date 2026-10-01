import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, ExternalLink, Menu, Sparkles, X } from 'lucide-react'
import { api } from './api'

const navigation = [
  ['about', 'About'], ['skills', 'Skills'], ['projects', 'Work'],
  ['experience', 'Experience'], ['services', 'Services'],
  ['testimonials', 'Kind words'], ['blogs', 'Writing'], ['contact', 'Contact'],
]

function SectionHeading({ index, eyebrow, title }) {
  return <div className="section-heading"><span>{index} / {eyebrow}</span><h2>{title}</h2></div>
}

function ContentCards({ items, kind }) {
  if (!items?.length) return null
  return <div className={`content-grid ${kind}-grid`}>
    {items.map((item) => {
      const image = item.data?.image_url || item.data?.image
      const link = item.data?.url || item.data?.link
      return <article className="content-item" key={item.id}>
        {image && <img src={image} alt="" loading="lazy" />}
        <div className="item-meta"><span>{item.data?.category || kind}</span><span>{String(item.id).padStart(2, '0')}</span></div>
        <h3>{item.title}</h3>
        <p>{item.summary || item.data?.description || item.data?.role || ''}</p>
        {link && <a className="text-link" href={link} target="_blank" rel="noreferrer">Explore <ExternalLink size={14} /></a>}
      </article>
    })}
  </div>
}

export default function App() {
  const [site, setSite] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitState, setSubmitState] = useState({ busy: false, message: '', error: false })

  useEffect(() => {
    Promise.all([
      api('/about'), api('/skills'), api('/projects'), api('/experience'),
      api('/services'), api('/testimonials'), api('/blogs'),
    ]).then(([about, skills, projects, experience, services, testimonials, blogs]) => {
      setSite({ about, skills, projects, experience, services, testimonials, blogs })
      document.title = `${about.name || 'Your Name'} | Portfolio`
    }).catch((error) => setLoadError(error.message)).finally(() => setLoading(false))
  }, [])

  const updateField = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submitContact = async (event) => {
    event.preventDefault()
    setSubmitState({ busy: true, message: '', error: false })
    try {
      const result = await api('/contact', { method: 'POST', body: form })
      setForm({ name: '', email: '', subject: '', message: '' })
      setSubmitState({ busy: false, message: result.message, error: false })
    } catch (error) {
      setSubmitState({ busy: false, message: error.message, error: true })
    }
  }

  const about = site?.about || {}
  const closeMenu = () => setMenuOpen(false)

  return <div className="site-shell">
    <header className="topbar">
      <a className="wordmark" href="#home" aria-label="Back to top"><span className="wordmark-mark">/</span> PORTFOLIO</a>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'} aria-label="Main navigation">
        {navigation.map(([id, label]) => <a key={id} href={`#${id}`} onClick={closeMenu}>{label}</a>)}
      </nav>
      <a className="availability" href="#contact"><span /> Contact</a>
    </header>

    <main>
      <section className="hero section-wrap" id="home">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> Independent practice <span className="eyebrow-dot">/</span> {about.location || 'Based anywhere'}</p>
          <h1>{about.name || 'Your Name'}<span className="hero-period">.</span></h1>
          <div className="hero-bottom">
            <p className="hero-intro">{about.headline || 'Thoughtful work, made with care.'}<span>{about.bio || 'Add a short introduction in the CMS to make this space yours.'}</span></p>
            <a className="round-link" href="#projects" aria-label="Explore selected work"><ArrowDownRight size={23} /></a>
          </div>
        </div>
        <div className="hero-side">
          {about.image_url && <img className="hero-image" src={about.image_url} alt={about.name || 'Portfolio portrait'} />}
          <div className="hero-side-note"><span>01 — 08</span><span>Portfolio / {new Date().getFullYear()}</span></div>
          <div className="hero-side-copy"><span className="side-mark"><Sparkles size={19} /></span><p>Curious by nature.<br />Intentional by design.</p></div>
        </div>
        <a className="scroll-cue" href="#about"><span>SCROLL TO EXPLORE</span><ArrowDownRight size={15} /></a>
      </section>

      {loadError && <div className="api-notice" role="status">Live portfolio content is unavailable right now. {loadError}</div>}
      {loading && <div className="loading-line" role="status">Loading portfolio content <span /></div>}

      <section className="section-wrap about-section" id="about">
        <SectionHeading index="01" eyebrow="The person" title="A little context." />
        <div className="about-content"><p className="about-lead">{about.bio || 'Your introduction is ready for your own words.'}</p>
          <dl className="about-facts">
            {about.location && <div><dt>Based in</dt><dd>{about.location}</dd></div>}
            {about.email && <div><dt>Email</dt><dd><a href={`mailto:${about.email}`}>{about.email}</a></dd></div>}
            {about.website && <div><dt>Elsewhere</dt><dd><a href={about.website} target="_blank" rel="noreferrer">Website <ArrowUpRight size={14} /></a></dd></div>}
          </dl>
        </div>
      </section>

      {!!site?.skills?.length && <section className="section-wrap compact-section" id="skills">
        <SectionHeading index="02" eyebrow="Capabilities" title="Things I work with." />
        <div className="skill-list">{site.skills.map((skill, index) => <div className="skill-row" key={skill.id}><span>{String(index + 1).padStart(2, '0')}</span><h3>{skill.title}</h3><p>{skill.summary || skill.data?.category || ''}</p></div>)}</div>
      </section>}

      {!!site?.projects?.length && <section className="section-wrap work-section" id="projects">
        <SectionHeading index="03" eyebrow="Selected work" title="Made with intent." /><ContentCards items={site.projects} kind="project" />
      </section>}

      {!!site?.experience?.length && <section className="section-wrap compact-section" id="experience">
        <SectionHeading index="04" eyebrow="The path" title="Experience." />
        <div className="timeline">{site.experience.map((item) => <article className="timeline-row" key={item.id}><span>{item.data?.period || item.data?.date || ''}</span><div><h3>{item.title}</h3><p>{item.data?.organization || item.data?.company || item.summary}</p>{item.data?.description && <p className="timeline-detail">{item.data.description}</p>}</div></article>)}</div>
      </section>}

      {!!site?.services?.length && <section className="section-wrap work-section" id="services">
        <SectionHeading index="05" eyebrow="Ways to collaborate" title="What I can help with." /><ContentCards items={site.services} kind="service" />
      </section>}

      {!!site?.testimonials?.length && <section className="section-wrap quote-section" id="testimonials">
        <SectionHeading index="06" eyebrow="Kind words" title="Shared perspective." />
        {site.testimonials.map((item) => <figure className="quote" key={item.id}><blockquote>{item.data?.quote || item.summary}</blockquote><figcaption>{item.title}<span>{item.data?.role || ''}</span></figcaption></figure>)}
      </section>}

      {!!site?.blogs?.length && <section className="section-wrap compact-section" id="blogs">
        <SectionHeading index="07" eyebrow="Notes & ideas" title="Writing." /><ContentCards items={site.blogs} kind="blog" />
      </section>}

      <section className="section-wrap contact-section" id="contact">
        <SectionHeading index="08" eyebrow="Say hello" title="Start a conversation." />
        <div className="contact-layout"><div><p className="contact-lead">Have a thoughtful challenge, a question, or just want to connect? Send a note.</p>{about.email && <a className="contact-email" href={`mailto:${about.email}`}>{about.email}<ArrowUpRight size={18} /></a>}</div>
          <form className="contact-form" onSubmit={submitContact}>
            <label>Name<input name="name" value={form.name} onChange={updateField} autoComplete="name" maxLength="120" required /></label>
            <label>Email<input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" maxLength="254" required /></label>
            <label>Subject<input name="subject" value={form.subject} onChange={updateField} maxLength="180" required /></label>
            <label>Message<textarea name="message" value={form.message} onChange={updateField} rows="4" maxLength="10000" required /></label>
            <div className="form-submit-row"><button className="submit-button" disabled={submitState.busy}>{submitState.busy ? 'Sending…' : 'Send message'} <ArrowUpRight size={16} /></button><p className={submitState.error ? 'form-status error' : 'form-status'} role="status">{submitState.message}</p></div>
          </form>
        </div>
      </section>
    </main>
    <footer className="footer"><a className="wordmark" href="#home"><span className="wordmark-mark">/</span> PORTFOLIO</a><span>Built with attention. © {new Date().getFullYear()}</span><a href="#home">Back to top ↑</a></footer>
  </div>
}
