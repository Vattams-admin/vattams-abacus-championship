import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "./lib/supabase";

type PortalView = "overview" | "register" | "schedule" | "exam" | "account" | "admin" | "help";

const nav: { id: PortalView; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "register", label: "Registration" },
  { id: "schedule", label: "Competition" },
  { id: "exam", label: "Exam room" },
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
        {view === "exam" && <StudentExamRoom />}
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
  const [competitions, setCompetitions] = useState<CompetitionEntry[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(false);
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

  const toIso = (value: string) => value ? new Date(value).toISOString() : null;

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
        registration_opens_at: toIso(registrationOpens),
        registration_closes_at: toIso(registrationCloses),
        starts_at: toIso(startsAt), ends_at: toIso(endsAt),
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


type ExamQuestion = { question_id: string; sequence_no: number; question: unknown };
type CompetitionEntry = { competition_id: string; title: string; description: string | null; status: string; starts_at: string | null; ends_at: string | null; registration_status: string; eligibility_status: string; age_group: string | null; can_start: boolean };
type ExamSession = { attempt_id: string; status: string; started_at: string; server_now: string; deadline_at: string; questions: ExamQuestion[] };
type QueuedAnswer = { response: string; response_version: number; client_saved_at: string };

type PublicQuestionPayload = { question?: unknown; options?: unknown; language?: unknown; topic?: unknown; subtopic?: unknown };
function ExamQuestionCard({ item, answer, waiting, disabled, onAnswer }: {
  item: ExamQuestion; answer: string; waiting: boolean; disabled: boolean; onAnswer: (value: string) => void;
}) {
  const payload = item.question && typeof item.question === "object" && !Array.isArray(item.question)
    ? item.question as PublicQuestionPayload : null;
  const prompt = typeof payload?.question === "string" ? payload.question
    : typeof item.question === "string" ? item.question : "Question content is unavailable.";
  const options = Array.isArray(payload?.options)
    ? payload.options.filter((value): value is string => typeof value === "string") : [];
  return <article className="exam-question" aria-labelledby={"question-title-" + item.question_id}>
    <div className="question-heading">
      <span id={"question-title-" + item.question_id}>QUESTION {item.sequence_no}</span>
      <span>{waiting ? "Waiting to sync" : "Response unchanged"}</span>
    </div>
    {typeof payload?.topic === "string" && <p className="question-topic">{payload.topic}{typeof payload.subtopic === "string" ? " · " + payload.subtopic : ""}</p>}
    <p className="question-prompt">{prompt}</p>
    {options.length > 0 ? <fieldset className="exam-options" disabled={disabled}>
      <legend>Select one answer</legend>
      {options.map((option, index) => <button key={index} type="button"
        className={"exam-option" + (answer === option ? " selected" : "")}
        aria-pressed={answer === option} onClick={() => onAnswer(option)}>
        <span className="option-letter">{String.fromCharCode(65 + index)}</span>{option}
      </button>)}
    </fieldset> : <>
      <label htmlFor={"answer-" + item.question_id}>Your answer</label>
      <input id={"answer-" + item.question_id} value={answer}
        onChange={event => onAnswer(event.target.value)} disabled={disabled} autoComplete="off" />
    </>}
  </article>;
}

function StudentExamRoom() {
  const [competitionId, setCompetitionId] = useState("");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Record<string, QueuedAnswer>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setSignedIn(Boolean(data.user)); });
    const { data } = supabase.auth.onAuthStateChange((_event, current) => setSignedIn(Boolean(current?.user)));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  useEffect(() => {
    if (!session || submitted) return;
    const serverOffset = new Date(session.server_now).getTime() - Date.now();
    const deadline = new Date(session.deadline_at).getTime();
    const update = () => setRemaining(Math.max(0, Math.ceil((deadline - (Date.now() + serverOffset)) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [session, submitted]);

  useEffect(() => {
    if (!session) return;
    try {
      const saved = localStorage.getItem("vattams-abacus-exam-" + session.attempt_id);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, QueuedAnswer>;
        setPending(parsed);
        setAnswers(Object.fromEntries(Object.entries(parsed).map(([id, value]) => [id, value.response])));
        setVersions(Object.fromEntries(Object.entries(parsed).map(([id, value]) => [id, value.response_version])));
      }
    } catch { setError("Saved offline responses could not be read. Keep this tab open and contact support before continuing."); }
  }, [session?.attempt_id]);

  useEffect(() => {
    if (!signedIn || !supabase) { setCompetitions([]); return; }
    let active = true;
    setLoadingCompetitions(true);
    supabase.functions.invoke("abacus-exam-engine", { body: { action: "list_my_competitions" } })
      .then(({ data, error: invokeError }) => {
        if (!active) return;
        if (invokeError || data?.error) {
          setError(invokeError?.message ?? data.error);
          setCompetitions([]);
        } else {
          const entries = Array.isArray(data?.result) ? data.result as CompetitionEntry[] : [];
          setCompetitions(entries);
          if (!competitionId && entries.length === 1) setCompetitionId(entries[0].competition_id);
        }
      })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "Unable to load your competitions."); })
      .finally(() => { if (active) setLoadingCompetitions(false); });
    return () => { active = false; };
  }, [signedIn]);

  async function invokeExam(payload: Record<string, unknown>) {
    if (!supabase) throw new Error("Participant authentication is not configured.");
    const { data, error: invokeError } = await supabase.functions.invoke("abacus-exam-engine", { body: payload });
    if (invokeError) throw new Error(invokeError.message);
    if (data?.error) throw new Error(data.error);
    return data?.result;
  }

  async function startOrResumeFor(id: string) {
    setCompetitionId(id);
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await invokeExam({ action: "start_or_resume", competition_id: id });
      if (!result?.attempt_id || !Array.isArray(result.questions)) throw new Error("The exam service returned an incomplete session.");
      setSession(result as ExamSession);
      setSubmitted(false);
      setMessage("Exam session restored. Your official deadline is controlled by the competition server.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to start the exam."); }
    finally { setBusy(false); }
  }

  async function startOrResume() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await invokeExam({ action: "start_or_resume", competition_id: competitionId.trim() });
      if (!result?.attempt_id || !Array.isArray(result.questions)) throw new Error("The exam service returned an incomplete session.");
      setSession(result as ExamSession);
      setSubmitted(false);
      setMessage("Exam session restored. Your official deadline is controlled by the competition server.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to start the exam."); }
    finally { setBusy(false); }
  }

  function updateAnswer(questionId: string, value: string) {
    const nextVersion = (versions[questionId] ?? 0) + 1;
    const queued = { response: value, response_version: nextVersion, client_saved_at: new Date().toISOString() };
    setAnswers(current => ({ ...current, [questionId]: value }));
    setVersions(current => ({ ...current, [questionId]: nextVersion }));
    setPending(current => {
      const next = { ...current, [questionId]: queued };
      if (session) {
        try { localStorage.setItem("vattams-abacus-exam-" + session.attempt_id, JSON.stringify(next)); }
        catch { setError("Device storage is full. Your latest response may not survive a refresh."); }
      }
      return next;
    });
  }

  async function flushPending() {
    if (!session) return;
    const entries = Object.entries(pending);
    for (const [questionId, item] of entries) {
      await invokeExam({
        action: "save_response", attempt_id: session.attempt_id, question_id: questionId,
        response: item.response, response_version: item.response_version, client_saved_at: item.client_saved_at
      });
      setPending(current => {
        const next = { ...current };
        if (next[questionId]?.response_version === item.response_version) delete next[questionId];
        try { localStorage.setItem("vattams-abacus-exam-" + session.attempt_id, JSON.stringify(next)); } catch { /* keep server copy */ }
        return next;
      });
    }
  }

  useEffect(() => {
    if (!session || !online || submitted || Object.keys(pending).length === 0) return;
    const timer = window.setTimeout(() => {
      flushPending().then(() => setMessage("All current answers are saved on the competition server."))
        .catch(e => setError(e instanceof Error ? e.message : "Autosave failed; your local queue is retained."));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [session, online, pending, submitted]);

  async function submitExam() {
    if (!session || !online || submitted || remaining === 0) return;
    if (!window.confirm("Submit your answers now? You cannot change them after submission.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await flushPending();
      await invokeExam({ action: "submit", attempt_id: session.attempt_id });
      setSubmitted(true);
      setMessage("Your submission has been received. Results remain withheld until official moderation.");
      try { localStorage.removeItem("vattams-abacus-exam-" + session.attempt_id); } catch { /* no-op */ }
    } catch (e) { setError(e instanceof Error ? e.message : "Submission failed. Your saved responses remain available for retry."); }
    finally { setBusy(false); }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return m + ":" + s;
  };

  return <div className="panel exam-room">
    <p className="eyebrow">LIVE COMPETITION · PARTICIPANT EXAM ROOM</p>
    <h2>Official Soroban challenge</h2>
    {!supabaseConfigured || !supabase ? <p className="form-error">The dedicated competition authentication connection is not configured in this deployment.</p> :
      !signedIn ? <><p>Sign in with your verified participant account before entering the exam room.</p><button className="secondary" onClick={() => window.dispatchEvent(new CustomEvent("abacus:navigate", { detail: "account" }))}>Go to secure sign in</button></> :
      !session ? <div className="auth-form">
        <h3>Your registered competitions</h3>
        {loadingCompetitions ? <p>Loading your secure competition list…</p> : competitions.length === 0 ? <p>No confirmed competition entries are linked to this account yet. Your entry must be confirmed and eligibility approved before an exam appears here.</p> :
          <div className="competition-entry-list">{competitions.map(entry => <article className="info-card" key={entry.competition_id}>
            <span className="card-number">{entry.age_group ?? "PARTICIPANT"}</span>
            <h3>{entry.title}</h3>
            {entry.description && <p>{entry.description}</p>}
            <p><strong>Eligibility:</strong> {entry.eligibility_status.replaceAll("_", " ")} · <strong>Registration:</strong> {entry.registration_status.replaceAll("_", " ")}</p>
            <p>{entry.starts_at ? "Starts: " + new Date(entry.starts_at).toLocaleString() : "Schedule to be announced"}</p>
            <button className="primary" disabled={busy || !online || !entry.can_start} onClick={() => { setCompetitionId(entry.competition_id); void startOrResumeFor(entry.competition_id); }}>
              {entry.can_start ? "Start / resume exam" : "Not open for exam"}
            </button>
          </article>)}</div>}
        <p className="form-note">This list is generated by the server for your signed-in account only. The exam engine independently rechecks all eligibility and timing rules when you start.</p>
      </div> :
      <>
        <div className="exam-status-row">
          <span className={online ? "connection-state connected" : "connection-state"}>{online ? "● Connected" : "● Offline · answers queued"}</span>
          <strong className="exam-clock" aria-live="off">{remaining === null ? "--:--" : formatTime(remaining)}</strong>
        </div>
        <p className="form-note">Server deadline: {new Date(session.deadline_at).toLocaleString()} · Attempt: {session.attempt_id}</p>
        {remaining === 0 && <p role="alert" className="form-error">The displayed deadline has passed. Editing and submission are disabled; reconnect to let the server finalize the attempt state.</p>}
        <div className="exam-question-list">
          {session.questions.map((item) => <ExamQuestionCard key={item.question_id} item={item}
            answer={answers[item.question_id] ?? ""} waiting={Boolean(pending[item.question_id])}
            disabled={submitted || remaining === 0}
            onAnswer={value => updateAnswer(item.question_id, value)} />)}
        </div>
        <div className="exam-actions">
          <button className="secondary" onClick={() => void flushPending().then(() => setMessage("All current answers are saved on the competition server.")).catch(e => setError(e.message))} disabled={busy || !online || Object.keys(pending).length === 0}>Save now</button>
          <button className="primary" onClick={() => void submitExam()} disabled={busy || !online || submitted || remaining === 0}>{busy ? "Submitting…" : submitted ? "Submitted" : "Submit final answers"}</button>
        </div>
        <p className="form-note">Local pending answers are kept on this device during network interruptions. Server confirmation is required before they count as saved.</p>
      </>
    }
    {message && <p role="status" className="form-success">{message}</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}

function HelpInfo() {
  return <div className="panel"><p className="eyebrow">FAIR PLAY & SUPPORT</p><h2>Rules and participant support</h2><p>Competition-specific dates, fees, age bands, permitted devices, accessibility arrangements and attempt rules will be published in the approved official rules before registration opens.</p><p>Do not share passwords, one-time codes or private answer materials with anyone claiming to provide competition support.</p></div>;
}

export default App;
