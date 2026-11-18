import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";

type PortalView = "overview" | "register" | "schedule" | "account" | "help";

const nav: { id: PortalView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "register", label: "Registration" },
  { id: "schedule", label: "Competition" },
  { id: "account", label: "Sign in" },
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

      <section className="hero hero-premium">
        <div className="hero-copy">
          <div className="hero-kicker"><span className="kicker-dot" /> INTERNATIONAL ONLINE CHAMPIONSHIP</div>
          <p className="eyebrow">VATTAMS · SOROBAN CHALLENGE</p>
          <h1>Think faster.<br /><em>Calculate smarter.</em></h1>
          <p className="intro">A focused online Soroban championship built around speed, accuracy and confident mental calculation. Prepare, qualify and compete in a secure scheduled challenge.</p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setView("register")}>Explore registration <span>→</span></button>
            <button className="secondary" onClick={() => setView("schedule")}>How the challenge works</button>
          </div>
          <div className="hero-proof">
            <span><b>01 + 04</b><small>Authentic Soroban</small></span>
            <span><b>ONLINE</b><small>Scheduled challenge</small></span>
            <span><b>SECURE</b><small>Verified results</small></span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-glow" />
          <div className="visual-topline"><span>JAPANESE METHOD</span><span className="live-indicator"><i /> COMPETITION PORTAL</span></div>
          <div className="hero-art" aria-label="Japanese Soroban with one heaven bead and four earth beads per rod">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="soroban">
              <div className="soroban-top" />
              {Array.from({ length: 10 }).map((_, i) => <div className="rod" key={i}><div className="heaven-rail"><b className="bead heaven-bead" /></div><div className="earth-rail">{Array.from({ length: 4 }).map((__, beadIndex) => <b className="bead earth-bead" key={beadIndex} />)}</div></div>)}
              <div className="soroban-bar" />
              <div className="soroban-base" />
            </div>
          </div>
          <div className="soroban-legend">
            <span><b>1</b><small>Upper bead · value 5</small></span>
            <span><b>4</b><small>Lower beads · value 1 each</small></span>
          </div>
          <div className="visual-caption">COUNT <i>·</i> CALCULATE <i>·</i> EXCEL</div>
        </div>
      </section>

      <nav className="nav-tabs" aria-label="Main navigation">
        {nav.map(item => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}
      </nav>

      <section className="content">
        {view === "overview" && <Overview onRegister={() => setView("register")} />}
        {view === "register" && <RegisterInfo />}
        {view === "schedule" && <CompetitionInfo />}
        {view === "account" && <AccountAccess />}
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

function AccountAccess() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setSignedInEmail(data.user?.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedInEmail(session?.user?.email ?? null);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function sendSignInLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    setBusy(false);
    if (authError) setError(authError.message);
    else setMessage("Check your email for the secure sign-in link. This app does not ask for or store your password.");
  }

  async function signOut() {
    if (!supabase) return;
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
    else setMessage("You have signed out.");
  }

  return <div className="panel">
    <p className="eyebrow">SECURE PARTICIPANT ACCESS</p>
    <h2>Sign in to your competition account.</h2>
    {!supabaseConfigured || !supabase ? (
      <>
        <p>Authentication is not activated because the dedicated Abacus Supabase URL and publishable key are not configured in this deployment.</p>
        <span className="status-tag">Supabase connection required</span>
      </>
    ) : signedInEmail ? (
      <>
        <p>Signed in as <strong>{signedInEmail}</strong>.</p>
        <p>Registration eligibility and exam access are still controlled by server-side approval; signing in alone does not create an approved competition entry.</p>
        <button className="primary" onClick={signOut}>Sign out</button>
      </>
    ) : (
      <form className="auth-form" onSubmit={sendSignInLink}>
        <label htmlFor="participant-email">Email address</label>
        <input id="participant-email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="participant@example.com" />
        <button className="primary" type="submit" disabled={busy}>{busy ? "Sending link…" : "Email me a secure sign-in link"}</button>
        <p className="form-note">Use the email address you want associated with your participant account. Guardian verification and competition registration are separate steps.</p>
      </form>
    )}
    {message && <p role="status" className="form-success">{message}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}

function HelpInfo() {
  return <div className="panel"><p className="eyebrow">FAIR PLAY & SUPPORT</p><h2>Rules and participant support</h2><p>Competition-specific dates, fees, age bands, permitted devices, accessibility arrangements and attempt rules will be published in the approved official rules before registration opens.</p><p>Do not share passwords, one-time codes or private answer materials with anyone claiming to provide competition support.</p></div>;
}

export default App;
