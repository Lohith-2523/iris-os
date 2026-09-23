'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Check, ChevronDown, CircleDollarSign, Clock3, Command, FileText, Gauge, Menu, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const actions = ['Create client', 'Create project', 'Assign team', 'Generate invoice', 'Schedule kickoff']
const modes = ['Acquire', 'Onboard', 'Deliver', 'Money', 'Intelligence']

function IrisMark() {
  return <span className="iris-mark" aria-hidden="true"><i /><i /></span>
}

function Navigation() {
  const [open, setOpen] = useState(false)
  return <header className="nav-shell">
    <a href="#top" className="brand"><IrisMark /> <span><b>IRISOS</b></span></a>
    <nav className="nav-links" aria-label="Main navigation">
      {['Product', 'Miles', 'Solutions', 'Integrations', 'Pricing'].map((item) => <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>)}
    </nav>
    <div className="nav-actions"><a href="#login">Log in</a><Button nativeButton={false} render={<a href="#pricing" />} size="sm" className="metal-button">Start using IrisOS <ArrowRight data-icon="inline-end" /></Button></div>
    <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
    {open && <div className="mobile-menu">{['Product', 'Miles', 'Solutions', 'Integrations', 'Pricing'].map((item) => <a onClick={() => setOpen(false)} key={item} href={`#${item.toLowerCase()}`}>{item}</a>)}</div>}
  </header>
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong>{delta && <small>{delta}</small>}</div>
}

function DashboardCore() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % 7), 1400)
    return () => window.clearInterval(id)
  }, [playing])
  const complete = step >= 6
  return <div className="machine-wrap">
    <div className="machine" onMouseEnter={() => setPlaying(false)} onMouseLeave={() => setPlaying(true)}>
      <div className="machine-edge"><span>IRIS / COMMAND CENTER</span><div className="status"><i /> SYSTEM ONLINE</div></div>
      <div className="app-shell">
        <aside className="app-nav"><IrisMark />{[Gauge, Users, FileText, CircleDollarSign].map((Icon, i) => <button key={i} aria-label={['Dashboard','Clients','Documents','Finance'][i]} className={i === 0 ? 'active' : ''}><Icon /></button>)}</aside>
        <div className="app-content">
          <div className="app-title"><div><small>COMMAND CENTER</small><h3>Good morning, Alex.</h3></div><span>AUG 16 · 09:41</span></div>
          <div className="metrics-grid"><Metric label="REVENUE" value={complete ? '₹18.6L' : '₹16.2L'} delta="+12.4%"/><Metric label="PROFIT" value="₹6.8L" delta="41.2% margin"/><Metric label="ACTIVE PROJECTS" value={step >= 3 ? '18' : '17'} /><Metric label="RECEIVABLES" value="₹4.2L" /></div>
          <div className="dash-grid">
            <div className="instrument chart"><div className="panel-label"><span>REVENUE SIGNAL</span><b>LAST 6 MONTHS</b></div><div className="bars">{[42,55,48,68,72,88,82,96].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div></div>
            <div className="instrument priority"><div className="panel-label"><span>PRIORITY TASKS</span><b>04</b></div>{['Approve launch creative','Review Q3 report','Nova kickoff'].map((t,i)=><div key={t} className={step >= i+3 ? 'task done' : 'task'}><i>{step >= i+3 && <Check />}</i><span>{t}</span><small>{i === 2 ? '10:30' : 'TODAY'}</small></div>)}</div>
          </div>
        </div>
      </div>
      <div className="atlas-tray">
        <div className="atlas-head"><span><Sparkles /> MILES</span><b>{complete ? 'EXECUTION COMPLETE' : step === 0 ? 'READY' : 'PROCESSING'}</b></div>
        <p>{step === 0 ? 'Onboard Nova Studio, create the launch project, assign the team, generate the invoice and schedule the kickoff.' : complete ? 'Nova Studio is ready. Every connected workspace has been updated.' : `${actions[Math.min(step - 1, 4)]}…`}</p>
        <div className="action-rail">{actions.map((a,i)=><span key={a} className={step > i ? 'complete' : step === i ? 'current' : ''}><i>{step > i ? <Check /> : i+1}</i>{a}</span>)}</div>
        <button onClick={() => {setStep(1); setPlaying(true)}}>{complete ? 'Run again' : step === 0 ? 'Confirm 5 actions' : 'Miles is working'} <ArrowRight /></button>
      </div>
    </div>
  </div>
}

function Fragmentation() {
  const modules = ['LEADS','PROJECTS','TASKS','SHEETS','CALENDAR','INVOICES','REPORTS','MESSAGES','MILES']
  return <section className="fragment-section" id="solutions"><div className="section-copy"><span className="eyebrow">01 / SYSTEM CONSOLIDATION</span><h2>You don&apos;t need another app.<br/><em>You need fewer of them.</em></h2><p>Every client signal, commercial detail and team handoff becomes part of one operating context.</p></div><div className="module-field">{modules.map((m,i)=><div key={m} className="module" style={{'--i':i} as React.CSSProperties}><small>0{i+1}</small><span>{m}</span><i /></div>)}<div className="core-label"><IrisMark/><b>IRISOS</b><span>ONE CONNECTED SYSTEM</span></div></div></section>
}

function Workflow() {
  return <section className="workflow" id="product"><div className="section-copy"><span className="eyebrow">02 / CONNECTED WORK</span><h2>Context moves.<br/><em>Busywork doesn&apos;t.</em></h2></div><div className="rail"><div className="rail-line" />{['LEAD','PROPOSAL','CLIENT','PROJECT','TASK','APPROVAL','INVOICE','REPORT'].map((s,i)=><div className="rail-node" key={s}><span>0{i+1}</span><div><b>{s}</b><small>{i < 2 ? 'NOVA STUDIO · ₹2.4L' : i < 5 ? 'LAUNCH SYSTEM · ACTIVE' : 'CONTEXT VERIFIED'}</small></div><i className="rail-led" /></div>)}</div></section>
}

function ModeShowcase() {
 const [mode,setMode]=useState(0)
 return <section className="showcase"><div className="mode-list">{modes.map((m,i)=><button key={m} onClick={()=>setMode(i)} className={i===mode?'active':''}><span>0{i+1}</span><b>{m}</b><small>{['Turn interest into revenue.','Create one connected client record.','Move work without losing context.','See every rupee in motion.','Ask, analyze, create and act.'][i]}</small></button>)}</div><div className="mode-machine"><div className="machine-edge"><span>IRIS / {modes[mode].toUpperCase()}</span><div className="status"><i /> LIVE VIEW</div></div>{mode===0?<Kanban/>:mode===1?<ClientView/>:mode===2?<ProjectView/>:mode===3?<FinanceView/>:<AtlasView/>}</div></section>
}
function WindowHeader({title,sub}:{title:string;sub:string}) {return <div className="window-head"><div><small>{sub}</small><h3>{title}</h3></div><button><Command/> COMMAND</button></div>}
function Kanban(){return <div className="window-body"><WindowHeader title="Lead Pipeline" sub="ACQUIRE"/><div className="kanban">{['NEW','WARM','QUALIFIED','CLOSED'].map((c,i)=><div className="kanban-col" key={c}><span>{c} <b>{i+2}</b></span>{i===2&&<div className="lead-card"><b>Nova Studio</b><small>Brand launch system</small><strong>₹2.4L</strong><div><i/>98% FIT</div></div>}{['Lumen Labs','North & Co.'].slice(0,i%2+1).map(n=><div className="ghost-card" key={n}>{n}</div>)}</div>)}</div></div>}
function ClientView(){return <div className="window-body"><WindowHeader title="Nova Studio" sub="CLIENT WORKSPACE"/><div className="client-tabs">Overview　 Projects　 Tasks　 Deliverables　 Billing</div><div className="client-grid"><div className="instrument"><small>RELATIONSHIP</small><strong>Active · 94 health</strong><div className="progress"><i/></div></div><div className="instrument"><small>CURRENT ENGAGEMENT</small><strong>Brand Launch System</strong><p>12 of 18 tasks complete</p></div><div className="instrument wide"><small>CONNECTED CONTEXT</small><div className="context-chain"><span>Proposal</span><i/><span>Contract</span><i/><span>Project</span><i/><span>Invoice</span></div></div></div></div>}
function ProjectView(){return <div className="window-body"><WindowHeader title="Launch System" sub="DELIVER"/><div className="project-stages">{['STRATEGY','DESIGN','REVIEW','LAUNCH'].map((s,i)=><div key={s}><span>{s}</span>{['Audience mapping','Campaign system','Creative approval','Go live'].slice(0,i===1?2:1).map((t,j)=><div className="project-card" key={t}><i>{i+1}.{j+1}</i><b>{t}</b><small>{i<2?'IN PROGRESS':'QUEUED'}</small></div>)}</div>)}</div></div>}
function FinanceView(){return <div className="window-body"><WindowHeader title="Financial Control" sub="MONEY"/><div className="finance-grid"><Metric label="CASH" value="₹24.8L" delta="+8.2%"/><Metric label="PROFIT" value="₹6.8L" delta="41.2%"/><Metric label="OUTSTANDING" value="₹4.2L"/><div className="instrument finance-chart"><small>OPERATING SIGNAL</small><div className="signal-line">{[40,55,48,70,62,84,74,94].map((h,i)=><i key={i} style={{height:`${h}%`}} />)}</div></div><div className="invoice-pane"><span>INVOICE / 0842</span><h4>Nova Studio</h4><p>Brand launch system</p><strong>₹2,40,000</strong><b>PAID</b></div></div></div>}
function AtlasView(){return <div className="window-body atlas-view"><WindowHeader title="Agency Intelligence" sub="MILES"/><div className="ask"><small>YOU</small><p>What needs my attention?</p></div><div className="atlas-answer"><small>MILES / ANALYSIS</small><h4>Three items require a decision.</h4>{['Nova Studio creative is ready for approval','₹1.8L invoice is 8 days overdue','Launch project has one blocked task'].map((x,i)=><button key={x}><span>0{i+1}</span>{x}<ArrowRight/></button>)}</div></div>}

function AtlasSection(){return <section className="atlas-section" id="atlas"><div className="atlas-orbit"><div className="orbit-ring"><span>ASK</span><span>ANALYZE</span><span>CREATE</span><span>ACT</span></div><div className="orbit-core"><Sparkles/><small>MILES / OPERATING LAYER</small><strong>What needs<br/>your attention?</strong><button>Analyze my agency <ArrowRight/></button></div></div><div className="atlas-copy"><span className="eyebrow">03 / YOUR OPERATING LAYER</span><h2>AI that doesn&apos;t<br/>just talk. <em>It works.</em></h2><p>Miles understands the same connected context your team works in, then turns intent into coordinated action—with you in control.</p><div className="capabilities">{['Ask across the agency','Analyze live business data','Create connected work','Act with confirmation'].map((c,i)=><span key={c}>0{i+1}　{c}</span>)}</div></div></section>}

function Pricing(){return <section className="pricing" id="pricing"><div className="section-copy"><span className="eyebrow">04 / CONFIGURE IRIS</span><h2>Choose your<br/><em>operating capacity.</em></h2></div><div className="plans">{[['BASIC','$99','Essential agency operations'],['PRO','$299','The complete operating system'],['ADVANCED','$599','Scale, control and intelligence']].map((p,i)=><article key={p[0]} className={i===1?'plan active':'plan'}><div className="plan-top"><span>IRIS / {p[0]}</span><i/></div><h3>{p[1]}<small>/ MO</small></h3><p>{p[2]}</p><ul>{(i===0?['Clients & projects','Tasks & calendar','Core finance']:i===1?['Everything in Basic','Miles operating layer','Client portal & reporting']:['Everything in Pro','Advanced permissions','Priority infrastructure']).map(f=><li key={f}><Check/>{f}</li>)}</ul><Button className="metal-button">Configure {p[0].toLowerCase()} <ArrowRight data-icon="inline-end"/></Button></article>)}</div></section>}

export function IrisLanding(){return <main id="top"><Navigation/><section className="hero"><div className="hero-grid"><div className="hero-copy"><span className="eyebrow"><i/> THE AI OPERATING SYSTEM FOR MODERN AGENCIES</span><h1>Run your entire agency<br/>from <em>one place.</em></h1><p>Clients. Projects. Tasks. Team. Finances. Reporting. Communication. And AI that actually gets work done.</p><div className="hero-actions"><Button nativeButton={false} render={<a href="#pricing" />} className="metal-button">Start using IrisOS <ArrowRight data-icon="inline-end"/></Button><Button nativeButton={false} render={<a href="#product" />} variant="outline" className="recessed-button">See IrisOS in action <ChevronDown data-icon="inline-end"/></Button></div></div><div className="hero-index"><span>IrisOS / 01</span><b>AGENCY<br/>OPERATING<br/>SYSTEM</b></div></div><DashboardCore/><div className="hero-caption"><span>ONE REQUEST</span><i/><span>MULTIPLE ACTIONS</span><i/><strong>ZERO BUSYWORK</strong></div></section><Fragmentation/><Workflow/><ModeShowcase/><AtlasSection/><section className="philosophy"><span>OPERATING PRINCIPLE / 01</span><h2>Clarity<br/>over complexity.</h2><p>One system. Every signal. The next action made obvious.</p></section><Pricing/><section className="trust"><div><ShieldCheck/><span>ENTERPRISE CONTROL</span><h2>Powerful where it should be.<br/>Restricted where it matters.</h2></div><div className="trust-grid">{['Role-based access','Miles action consent','Encrypted infrastructure','Complete audit trail'].map(x=><span key={x}><i/><b>{x}</b><small>ENFORCED</small></span>)}</div></section><footer><div className="footer-brand"><IrisMark/><b>IRISOS</b><span>The agency operating system.</span></div><div><a href="#product">Product</a><a href="#atlas">Miles</a><a href="#pricing">Pricing</a></div><small>© 2026 IrisOS</small></footer></main>}
