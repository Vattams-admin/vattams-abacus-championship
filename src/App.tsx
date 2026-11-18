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

  useEffect(() => {
    const handleNavigate = (event: Event) => setView((event as CustomEvent<PortalView>).detail);
    window.addEventListener("abacus:navigate", handleNavigate);
    return () => window.removeEventListener("abacus:navigate", handleNavigate);
  }, []);

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
  const [mode, setMode] = useState<"student" | "guardian">("student");
  const [competitionSlug, setCompetitionSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [intentId, setIntentId] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
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

  async function submitIntent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("abacus-registration-intent", {
      body: {
        competition_slug: competitionSlug.trim(),
        student_display_name: displayName.trim(),
        date_of_birth: dob,
        guardian_email: guardianEmail.trim().toLowerCase()
      }
    });
    setBusy(false);
    if (invokeError) setError(invokeError.message);
    else {
      setIntentId(data.intent_id ?? "");
      setMessage("Request created. Share the request reference with the named guardian. The guardian must sign in using that exact email and confirm consent.");
    }
  }

  async function confirmConsent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("abacus-guardian-consent", {
      body: { intent_id: intentId.trim(), consent_accepted: consentAccepted }
    });
    setBusy(false);
    if (invokeError) setError(invokeError.message);
    else {
      setMessage(data.message ?? "Guardian consent recorded. Registration is awaiting eligibility review.");
      setIntentId("");
      setConsentAccepted(false);
    }
  }

  return <div className="panel">
    <p className="eyebrow">SECURE STUDENT / GUARDIAN REGISTRATION</p>
    <h2>Start your championship entry.</h2>
    {!supabaseConfigured || !supabase ? (
      <><p>The registration service is not available in this deployment until the dedicated Abacus Supabase URL and publishable key are configured.</p><span className="status-tag">Deployment configuration required</span></>
    ) : !signedInEmail ? (
      <><p>Sign in with a verified email before starting. Student and guardian accounts must be separate for this consent workflow.</p><button className="primary" onClick={() => window.dispatchEvent(new CustomEvent("abacus:navigate", { detail: "account" }))}>Go to sign in →</button></>
    ) : (
      <>
        <p>Signed in as <strong>{signedInEmail}</strong>. Choose the correct step for this account.</p>
        <div className="mode-tabs">
          <button type="button" className={mode === "student" ? "selected" : ""} onClick={() => { setMode("student"); setError(""); setMessage(""); }}>Student request</button>
          <button type="button" className={mode === "guardian" ? "selected" : ""} onClick={() => { setMode("guardian"); setError(""); setMessage(""); }}>Guardian consent</button>
        </div>
        {mode === "student" ? (
          <form className="auth-form" onSubmit={submitIntent}>
            <label htmlFor="competition-slug">Competition code</label>
            <input id="competition-slug" required maxLength={80} value={competitionSlug} onChange={e => setCompetitionSlug(e.target.value)} placeholder="Official competition code" />
            <label htmlFor="student-display-name">Participant name</label>
            <input id="student-display-name" required minLength={2} maxLength={120} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Name as it should appear on the entry" />
            <label htmlFor="student-dob">Date of birth</label>
            <input id="student-dob" type="date" required value={dob} onChange={e => setDob(e.target.value)} />
            <label htmlFor="guardian-email">Parent / guardian email</label>
            <input id="guardian-email" type="email" required maxLength={254} value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} placeholder="parent@example.com" />
            <button className="primary" type="submit" disabled={busy}>{busy ? "Creating secure request…" : "Create guardian consent request"}</button>
            <p className="form-note">The request is private and expires after 24 hours. It does not create an approved registration or exam attempt. The named guardian must sign in separately to confirm consent.</p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={confirmConsent}>
            <label htmlFor="consent-intent-id">Student request reference</label>
            <input id="consent-intent-id" required value={intentId} onChange={e => setIntentId(e.target.value)} placeholder="Paste the request UUID shared by the student" />
            <label className="consent-check"><input type="checkbox" checked={consentAccepted} onChange={e => setConsentAccepted(e.target.checked)} required /> I am the parent / legal guardian using the verified email address named in this request. I have reviewed and agree to the competition consent terms shown by the organiser.</label>
            <button className="primary" type="submit" disabled={busy || !consentAccepted}>{busy ? "Confirming consent…" : "Confirm guardian consent"}</button>
            <p className="form-note">Your signed-in email must exactly match the guardian email on the request. A successful confirmation submits the entry for eligibility review; it does not grant exam access.</p>
          </form>
        )}
      </>
    )}
    {message && <p role="status" className="form-success">{message}{intentId && mode === "student" ? <><br /><strong>Request reference:</strong> <code>{intentId}</code></> : null}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
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
