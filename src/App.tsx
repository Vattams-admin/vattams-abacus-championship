import { useState } from "react";

type PortalView = "overview" | "register" | "schedule" | "help";

const nav: { id: PortalView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "register", label: "Registration" },
  { id: "schedule", label: "Competition" },
  { id: "help", label: "Help & rules" }
];

function App() {
  const [view, setView] = useState<PortalView>("overview");

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={() => setView("overview")} aria-label="VATTAMS Abacus home">
          <span className="brand-mark">V</span>
          <span><strong>VATTAMS</strong><small>ABACUS BEADS CHAMPIONSHIP</small></span>
        </a>
        <span className="online-pill"><i /> Online competition portal</span>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">THINK · CALCULATE · ACHIEVE</p>
          <h1>Every bead counts.<br /><em>Every second matters.</em></h1>
          <p className="intro">A dedicated online abacus championship experience. Register, complete eligibility checks and take your scheduled challenge securely online.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setView("register")}>Explore registration <span>→</span></button>
            <button className="secondary" onClick={() => setView("schedule")}>Competition process</button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="soroban">
            <div className="soroban-top" />
            {Array.from({ length: 7 }).map((_, i) => <div className="rod" key={i}><b /><b /><b /><b /><b /></div>)}
            <div className="soroban-bar" />
            <div className="soroban-base" />
          </div>
          <span className="art-caption">FOCUS / SPEED / ACCURACY</span>
        </div>
      </section>

      <nav className="nav-tabs" aria-label="Main navigation">
        {nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}
      </nav>

      <section className="content">
        {view === "overview" && <Overview onRegister={() => setView("register")} />}
        {view === "register" && <RegisterInfo />}
        {view === "schedule" && <CompetitionInfo />}
        {view === "help" && <HelpInfo />}
      </section>

      <footer><span>© {new Date().getFullYear()} VATTAMS Abacus Beads Championship</span><span>Independent online competition platform</span></footer>
    </main>
  );
}

function Overview({ onRegister }: { onRegister: () => void }) {
  return <>
    <div className="section-heading"><div><p className="eyebrow">YOUR CHAMPIONSHIP JOURNEY</p><h2>Compete with confidence.</h2></div><span className="status-tag">Registration workflow in development</span></div>
    <div className="cards">
      <article className="info-card"><span className="card-number">01</span><h3>Register</h3><p>Create your competition profile with student and guardian details where required.</p></article>
      <article className="info-card"><span className="card-number">02</span><h3>Get verified</h3><p>Our competition team checks age-group eligibility and registration status.</p></article>
      <article className="info-card"><span className="card-number">03</span><h3>Take the challenge</h3><p>Join your scheduled timed attempt. Your progress is designed for secure saving and recovery.</p></article>
      <article className="info-card"><span className="card-number">04</span><h3>View results</h3><p>Scores are checked and approved before results and certificates are published.</p></article>
    </div>
    <div className="notice"><strong>Competition integrity first</strong><p>Official question papers and answer keys are not displayed here. The live exam, scoring and registration services will be enabled only after backend security and content-review checks pass.</p><button onClick={onRegister}>Registration information →</button></div>
  </>;
}

function RegisterInfo() {
  return <div className="panel"><p className="eyebrow">STUDENT / GUARDIAN ENTRY</p><h2>Registration is being prepared.</h2><p>The secure registration service is not connected yet. This screen intentionally does not collect or store personal information until authentication, consent, validation and server-side registration are ready.</p><ul><li>Student account authentication</li><li>Guardian consent and contact verification when required</li><li>Date-of-birth and age-band eligibility review</li><li>Admin approval before an exam attempt is issued</li></ul><span className="status-tag">Backend connection required</span></div>;
}

function CompetitionInfo() {
  return <div className="panel"><p className="eyebrow">SCHEDULED ONLINE ATTEMPT</p><h2>How the online challenge will work</h2><ol><li>Only approved registrations receive an attempt.</li><li>The server authorises the start time and deadline.</li><li>Questions are delivered without answer keys or scoring data.</li><li>Responses are saved and can recover after a network interruption.</li><li>Final submission is locked and scored on the server.</li><li>Results are published only after moderation and approval.</li></ol><span className="status-tag">No live exam is open yet</span></div>;
}

function HelpInfo() {
  return <div className="panel"><p className="eyebrow">FAIR PLAY & SUPPORT</p><h2>Rules and participant support</h2><p>Competition-specific dates, fees, age bands, permitted devices, accessibility arrangements and attempt rules will be published in the approved official rules before registration opens.</p><p>Do not share passwords, one-time codes or private answer materials with anyone claiming to provide competition support.</p></div>;
}

export default App;
