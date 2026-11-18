import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";

type PortalView = "overview" | "register" | "schedule" | "account" | "admin" | "help";

const nav: { id: PortalView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "register", label: "Registration" },
  { id: "schedule", label: "Competition" },
  { id: "account", label: "Sign in" },
  { id: "admin", label: "Admin" },
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
        {view === "admin" && <AdminConsole />}
        {view === "help" && <HelpInfo />}
      </section>

      <footer><span>© {new Date().getFullYear()} VATTAMS Abacus Beads Championship</span><span>Independent online competition platform</span></footer>
    </main>
  );
}

function Overview({ onRegister }: { onRegister: () => void }) {
  return <>
    <div className="section-heading"><div><p className="eyebrow">YOUR CHAMPIONSHIP JOURNEY</p><h2>Compete with confidence.</h2></div><span className="status-tag">Registration requires competition setup</span></div>
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
  const [consentVersion, setConsentVersion] = useState("");
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
        guardian_email: guardianEmail.trim().toLowerCase()
      }
    });
    setBusy(false);
    if (invokeError) setError(invokeError.message);
    else {
      setIntentId(data.intent_id ?? "");
      setConsentVersion(data.consent_version ?? "");
      setMessage("Request created. Share the request reference with the named guardian. The guardian must sign in using that exact email and confirm consent.");
    }
  }

  async function confirmConsent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("abacus-guardian-consent", {
      body: {
        intent_id: intentId.trim(),
        consent_accepted: consentAccepted,
        student_display_name: displayName.trim(),
        date_of_birth: dob
      }
    });
    setBusy(false);
    if (invokeError) setError(invokeError.message);
    else {
      setMessage(data.message ?? "Guardian consent recorded. Registration is awaiting eligibility review.");
      setIntentId("");
      setConsentVersion("");
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
            <label htmlFor="guardian-email">Parent / guardian email</label>
            <input id="guardian-email" type="email" required maxLength={254} value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} placeholder="parent@example.com" />
            <button className="primary" type="submit" disabled={busy}>{busy ? "Creating secure request…" : "Create guardian consent request"}</button>
            <p className="form-note">This first step stores only the student account reference and guardian email. It does not collect the participant name or date of birth. The request expires after 24 hours; the guardian enters participant details only after signing in separately and reviewing the consent statement.</p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={confirmConsent}>
            <label htmlFor="consent-intent-id">Student request reference</label>
            <input id="consent-intent-id" required value={intentId} onChange={e => setIntentId(e.target.value)} placeholder="Paste the request UUID shared by the student" />
            <label htmlFor="guardian-student-name">Participant name</label>
            <input id="guardian-student-name" required minLength={2} maxLength={120} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Name as it should appear on the entry" />
            <label htmlFor="guardian-student-dob">Participant date of birth</label>
            <input id="guardian-student-dob" type="date" required value={dob} onChange={e => setDob(e.target.value)} />
            <label className="consent-check"><input type="checkbox" checked={consentAccepted} onChange={e => setConsentAccepted(e.target.checked)} required /> I am the parent / legal guardian using the verified email address named in this request. I have reviewed the consent summary above and authorise processing of the participant details I am submitting for this competition.</label>
            <button className="primary" type="submit" disabled={busy || !consentAccepted}>{busy ? "Confirming consent…" : "Confirm guardian consent"}</button>
            <div className="consent-summary"><strong>Guardian consent summary</strong><p>I confirm that I am the parent or legal guardian of this participant. I authorise VATTAMS Abacus Beads Championship to process the participant details supplied for competition registration, age-group eligibility review, participant support and competition administration under the published competition rules and privacy notice.</p><small>Consent / rules version: {consentVersion || "Version is checked by the server"}</small></div><p className="form-note">Your signed-in email must exactly match the guardian email on the request. The full privacy notice and final consent wording must be published before public registration opens. A successful confirmation submits the entry for eligibility review; it does not grant exam access.</p>
          </form>
        )}
      </>
    )}
    {message && <p role="status" className="form-success">{message}{intentId && mode === "student" ? <><br /><strong>Request reference:</strong> <code>{intentId}</code><br /><strong>Consent version:</strong> {consentVersion}</> : null}</p>}
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

function AdminConsole() {
  const [competitionId, setCompetitionId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rulesVersion, setRulesVersion] = useState("1.0");
  const [ageCutoff, setAgeCutoff] = useState("");
  const [registrationOpens, setRegistrationOpens] = useState("");
  const [registrationCloses, setRegistrationCloses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [duration, setDuration] = useState("1800");
  const [ageGroupsJson, setAgeGroupsJson] = useState('[\n  { "code": "OPEN", "label": "Age group", "min_age_months": 0, "max_age_months": 1200, "question_count": 30, "duration_seconds": 1800 }\n]');
  const [reviewId, setReviewId] = useState("");
  const [decision, setDecision] = useState<"approved" | "rejected" | "needs_information">("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function callAdmin(action: string, payload: Record<string, unknown>) {
    if (!supabase) { setError("Supabase is not configured in this deployment."); return; }
    setBusy(true); setError(""); setMessage("");
    const { data, error: invokeError } = await supabase.functions.invoke("abacus-admin-workflow", {
      body: { action, ...payload }
    });
    setBusy(false);
    if (invokeError) setError(invokeError.message);
    else setMessage(JSON.stringify(data));
  }

  async function saveConfiguration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let ageGroups: unknown;
    try { ageGroups = JSON.parse(ageGroupsJson); }
    catch { setError("Age groups must be valid JSON."); return; }
    if (!Array.isArray(ageGroups) || ageGroups.length === 0) {
      setError("Add at least one age group."); return;
    }
    await callAdmin("save_configuration", {
      competition_id: competitionId.trim() || null,
      config: {
        slug: slug.trim(), title: title.trim(), description: description.trim(),
        status: "draft", rules_version: rulesVersion.trim(), age_cutoff_date: ageCutoff,
        registration_opens_at: registrationOpens || null,
        registration_closes_at: registrationCloses || null,
        starts_at: startsAt || null, ends_at: endsAt || null,
        duration_seconds: Number(duration), age_groups: ageGroups
      }
    });
  }

  async function submitReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await callAdmin("review_registration", {
      registration_id: reviewId.trim(), decision, note: reviewNote.trim()
    });
  }

  return <div className="panel">
    <p className="eyebrow">RESTRICTED STAFF WORKSPACE</p>
    <h2>Competition administration</h2>
    <p>Only verified accounts with an active staff role can use these server-checked actions. Access is never granted by a browser role setting.</p>
    {!supabaseConfigured || !supabase ? <span className="status-tag">Supabase configuration required</span> : <>
      <form className="auth-form" onSubmit={saveConfiguration}>
        <h3>Competition configuration</h3>
        <label htmlFor="admin-competition-id">Existing competition ID (leave blank to create)</label>
        <input id="admin-competition-id" value={competitionId} onChange={e => setCompetitionId(e.target.value)} placeholder="UUID for an existing competition" />
        <label htmlFor="admin-slug">Competition slug</label>
        <input id="admin-slug" required maxLength={100} value={slug} onChange={e => setSlug(e.target.value)} />
        <label htmlFor="admin-title">Competition title</label>
        <input id="admin-title" required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} />
        <label htmlFor="admin-description">Description</label>
        <textarea id="admin-description" value={description} onChange={e => setDescription(e.target.value)} />
        <label htmlFor="admin-rules">Rules version</label>
        <input id="admin-rules" required value={rulesVersion} onChange={e => setRulesVersion(e.target.value)} />
        <label htmlFor="admin-cutoff">Age cutoff date</label>
        <input id="admin-cutoff" type="date" required value={ageCutoff} onChange={e => setAgeCutoff(e.target.value)} />
        <label htmlFor="admin-opens">Registration opens (with timezone)</label>
        <input id="admin-opens" type="datetime-local" value={registrationOpens} onChange={e => setRegistrationOpens(e.target.value)} />
        <label htmlFor="admin-closes">Registration closes (with timezone)</label>
        <input id="admin-closes" type="datetime-local" value={registrationCloses} onChange={e => setRegistrationCloses(e.target.value)} />
        <label htmlFor="admin-starts">Competition starts (with timezone)</label>
        <input id="admin-starts" type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} />
        <label htmlFor="admin-ends">Competition ends (with timezone)</label>
        <input id="admin-ends" type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
        <label htmlFor="admin-duration">Default duration (seconds)</label>
        <input id="admin-duration" type="number" min="60" max="14400" required value={duration} onChange={e => setDuration(e.target.value)} />
        <label htmlFor="admin-age-groups">Age groups JSON</label>
        <textarea id="admin-age-groups" rows={8} required value={ageGroupsJson} onChange={e => setAgeGroupsJson(e.target.value)} />
        <p className="form-note">The example age band is a draft placeholder only. Replace it with competition-owner-approved age boundaries before saving. Saving creates a draft; it does not open registration.</p>
        <button className="primary" type="submit" disabled={busy}>{busy ? "Saving securely…" : "Save draft configuration"}</button>
      </form>
      <hr />
      <form className="auth-form" onSubmit={submitReview}>
        <h3>Eligibility review</h3>
        <label htmlFor="admin-registration-id">Registration ID</label>
        <input id="admin-registration-id" required value={reviewId} onChange={e => setReviewId(e.target.value)} placeholder="Registration UUID" />
        <label htmlFor="admin-decision">Decision</label>
        <select id="admin-decision" value={decision} onChange={e => setDecision(e.target.value as typeof decision)}>
          <option value="approved">Approve eligibility</option>
          <option value="rejected">Reject eligibility</option>
          <option value="needs_information">Request more information</option>
        </select>
        <label htmlFor="admin-review-note">Review note</label>
        <textarea id="admin-review-note" maxLength={1000} value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
        <button className="primary" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit eligibility decision"}</button>
      </form>
    </>}
    {message && <p role="status" className="form-success">{message}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}

function HelpInfo() {
  return <div className="panel"><p className="eyebrow">FAIR PLAY & SUPPORT</p><h2>Rules and participant support</h2><p>Competition-specific dates, fees, age bands, permitted devices, accessibility arrangements and attempt rules will be published in the approved official rules before registration opens.</p><p>Do not share passwords, one-time codes or private answer materials with anyone claiming to provide competition support.</p></div>;
}

export default App;
