"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Copy,
  FileText,
  Fingerprint,
  Link2,
  Mail,
  Plus,
  RotateCcw,
  ShieldCheck,
  PenLine,
  Upload,
} from "lucide-react";
import Brand from "./brand";
import ProcessingState from "./processing-state";
import EmailExports from "./email-exports";
import MarkdownEditor from "./markdown-editor";
import { emailBodyText } from "../src/markdown";
import { useToast } from "./toast-provider";
import SavedEmailHistory from "./saved-email-history";
import { saveHistory } from "../src/email-history";
import { Field, ProfileEditor, ProfileView, humanize } from "./profile-fields";
import { validateLinkedInUrl } from "../src/validate-job-url.js";
import {
  normalizeJobProfile,
  selectProfileRole,
  confirmJobProfile,
} from "../src/job-profile.js";
import {
  analyzeJobRequirements,
  confirmRequirementsProfile,
} from "../src/requirements-analysis.js";
import {
  analysisEditorValues,
  applyAnalysisCorrections,
} from "../src/analysis-review.js";
import {
  buildCandidateProfile,
  candidateEditorValues,
  applyCandidateCorrections,
  confirmCandidateProfile,
} from "../src/candidate-profile.js";
import {
  matchProfiles,
  confirmRelevanceProfile,
} from "../src/relevance-engine.js";

const stages = [
  {
    name: "The opportunity",
    short: "Job",
    icon: Link2,
    title: "Start with the right opportunity.",
    subtitle:
      "Bring a LinkedIn job or hiring post. Let’s understand what comes next.",
  },
  {
    name: "The requirements",
    short: "Requirements",
    icon: FileText,
    title: "Read between the requirements.",
    subtitle:
      "Review what matters to this role, with evidence from the original posting.",
  },
  {
    name: "Your experience",
    short: "Profile",
    icon: Fingerprint,
    title: "The story only you can tell.",
    subtitle:
      "Bring your resume, add context, and make sure every detail feels right.",
  },
  {
    name: "Your introduction",
    short: "Email",
    icon: Mail,
    title: "Make your first words count.",
    subtitle: "A thoughtful application, built on the facts you’ve reviewed.",
  },
];
const contextKeys = [
  "noticePeriod",
  "availability",
  "currentLocation",
  "relocation",
  "currentCTC",
  "expectedCTC",
  "preferredLocation",
  "preferredRole",
  "workMode",
  "shiftAvailability",
];
const blank = () => ({
  job: null,
  requirements: null,
  candidate: null,
  relevance: null,
  email: null,
});

function Panel({ title, description, children, icon: Icon }) {
  return (
    <section className="workspace-card">
      <div className="mb-6 flex items-start gap-3">
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-lime/15 bg-lime/5 text-lime">
            <Icon size={17} />
          </span>
        )}
        <div>
          <h2 className="text-lg font-medium tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1.5 text-sm leading-6 text-muted">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
function Continue({ children = "Confirm & continue", onClick, disabled }) {
  return (
    <button
      type="button"
      className="button-primary"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      <ArrowRight size={15} />
    </button>
  );
}
function Disclosure({ title, children, open = false }) {
  return (
    <details open={open} className="rounded-lg border border-white/10 p-4">
      <summary className="text-sm font-medium">{title}</summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

export default function Workspace() {
  const notify = useToast();
  const [stage, setStage] = useState(0),
    [data, setData] = useState(blank),
    [url, setUrl] = useState(""),
    [manual, setManual] = useState(false);
  const [draftJob, setDraftJob] = useState(null),
    [sourceJob, setSourceJob] = useState(null),
    [draftRequirements, setDraftRequirements] = useState(null),
    [analysisEdit, setAnalysisEdit] = useState(null);
  const [draftCandidate, setDraftCandidate] = useState(null),
    [candidateEdit, setCandidateEdit] = useState(null),
    [resumeText, setResumeText] = useState(""),
    [file, setFile] = useState(null);
  const [context, setContext] = useState({}),
    [writing, setWriting] = useState({
      previousApplicationEmail: "",
      preferences: "",
    });
  const [providers, setProviders] = useState([]),
    [providerState, setProviderState] = useState("loading");
  const [preferences, setPreferences] = useState({
      provider: "",
      tone: "professional",
      length: "standard",
      instruction: "",
    }),
    [additional, setAdditional] = useState({});
  const [busy, setBusy] = useState(""),
    [notice, setNotice] = useState(null),
    [emailEdited, setEmailEdited] = useState(false),
    [originalEmail, setOriginalEmail] = useState(null),
    [generationCount, setGenerationCount] = useState(0);
  const [versions, setVersions] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [historyRevision, setHistoryRevision] = useState(0);
  const animateNextEmail = useRef(false);
  const [typedSubject, setTypedSubject] = useState("");
  const [typedBody, setTypedBody] = useState("");
  const [emailTyping, setEmailTyping] = useState(false);
  const regenerationCount = Math.max(0, generationCount - 1);
  const regenerationLimitReached = generationCount >= 3;
  const limitMessage =
    "You have reached the maximum limit of regenerations (2/2).";
  const generationInFlight = useRef(false);
  const request = useRef({ version: 0, controller: null });
  const heading = useRef(null);
  const fileInput = useRef(null);
  useEffect(() => {
    if (!file && fileInput.current) fileInput.current.value = "";
  }, [file]);
  useEffect(
    () => () => {
      request.current.version++;
      request.current.controller?.abort();
    },
    [],
  );
  useEffect(() => {
    heading.current?.focus();
  }, [stage]);

  useEffect(() => {
    if (!originalEmail) {
      setEmailTyping(false);
      setTypedSubject("");
      setTypedBody("");
      return;
    }
    if (!animateNextEmail.current) {
      setTypedSubject(originalEmail.subject);
      setTypedBody(originalEmail.body);
      setEmailTyping(false);
      return;
    }
    animateNextEmail.current = false;
    const characters = Array.from(originalEmail.subject);
    const bodyCharacters = Array.from(originalEmail.body);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer;
    const finish = () => {
      clearInterval(timer);
      setTypedSubject(originalEmail.subject);
      setTypedBody(originalEmail.body);
      setEmailTyping(false);
    };
    if (motion.matches) {
      finish();
      return;
    }
    const started = Date.now();
    const subjectDuration = Math.min(2000, characters.length * 32);
    const bodyDuration = Math.min(4000, bodyCharacters.length * 18);
    setTypedSubject("");
    setTypedBody("");
    setEmailTyping(true);
    timer = setInterval(() => {
      const elapsed = Date.now() - started;
      const subjectIndex = Math.floor(
        characters.length * Math.min(1, elapsed / Math.max(1, subjectDuration)),
      );
      const bodyIndex = Math.floor(
        bodyCharacters.length *
          Math.min(1, elapsed / Math.max(1, bodyDuration)),
      );
      setTypedSubject(characters.slice(0, subjectIndex).join(""));
      setTypedBody(bodyCharacters.slice(0, bodyIndex).join(""));
      if (elapsed >= Math.max(subjectDuration, bodyDuration)) finish();
    }, 16);
    const onMotionChange = () => {
      if (motion.matches) finish();
    };
    motion.addEventListener("change", onMotionChange);
    return () => {
      clearInterval(timer);
      motion.removeEventListener("change", onMotionChange);
    };
  }, [originalEmail]);

  function cancel() {
    request.current.version++;
    request.current.controller?.abort();
    setBusy("");
  }
  function invalidate(from) {
    cancel();
    setVersions([]);
    setFeedback("");
    setNotice(null);
    setData((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, val], i) => [
          key,
          i >= from ? null : val,
        ]),
      ),
    );
    if (from <= 1) {
      setDraftRequirements(null);
      setAnalysisEdit(null);
    }
    setOriginalEmail(null);
    setEmailEdited(false);
    setAdditional({});
  }
  function go(next) {
    setStage(next);
    setNotice(null);
  }
  function safely(action) {
    try {
      action();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    }
  }
  async function processLocally(label, action) {
    cancel();
    const version = request.current.version;
    setNotice(null);
    setBusy(label);
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    if (version !== request.current.version) return;
    try {
      action();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally {
      setBusy("");
    }
  }
  async function fetchData(path, options, label, onSuccess, timeout = 20000) {
    cancel();
    const version = ++request.current.version;
    const controller = new AbortController();
    request.current.controller = controller;
    setBusy(label);
    setNotice(null);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    try {
      const response = await fetch(path, {
        ...options,
        signal: controller.signal,
      });
      const result = await response.json();
      if (version !== request.current.version) return;
      if (!response.ok || result.error)
        throw new Error(
          result.error?.message || "Something went wrong. Please try again.",
        );
      onSuccess(result);
    } catch (error) {
      if (version === request.current.version)
        setNotice({
          type: "error",
          text: timedOut
            ? "This took too long. Please try again or enter your details manually."
            : error.message || "Unable to connect. Please try again.",
        });
    } finally {
      clearTimeout(timer);
      if (version === request.current.version) setBusy("");
    }
  }
  function newApplication() {
    cancel();
    setData(blank());
    setStage(0);
    setUrl("");
    setManual(false);
    setDraftJob(null);
    setSourceJob(null);
    setDraftRequirements(null);
    setAnalysisEdit(null);
    setDraftCandidate(null);
    setCandidateEdit(null);
    setResumeText("");
    setFile(null);
    setContext({});
    setWriting({ previousApplicationEmail: "", preferences: "" });
    setNotice(null);
    setAdditional({});
    setOriginalEmail(null);
    setGenerationCount(0);
    setVersions([]);
    setFeedback("");
    setEmailEdited(false);
  }
  function useManual() {
    invalidate(0);
    setManual(true);
    setSourceJob(null);
    setDraftJob(
      normalizeJobProfile({
        sourceUrl: url.trim() || null,
        entryMethod: "manual",
      }),
    );
  }
  async function extract(event) {
    event.preventDefault();
    invalidate(0);
    setDraftJob(null);
    setSourceJob(null);
    setManual(false);
    const validated = validateLinkedInUrl(url);
    if (!validated.valid) {
      setNotice({ type: "error", text: validated.message });
      return;
    }
    await fetchData(
      "/api/extract-job",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: validated.validatedJobUrl }),
      },
      "Reading the opportunity…",
      (result) => {
        if (!result.job || result.job.sourceUrl !== validated.validatedJobUrl)
          throw new Error(
            "The job details could not be verified. Enter them manually or try again.",
          );
        const profile = normalizeJobProfile(result.job);
        setDraftJob(profile);
        setSourceJob(profile);
        if (result.job.extractionStatus === "partial")
          setNotice({
            type: "info",
            text: "Some details are missing. Review and complete the information below.",
          });
      },
    );
  }
  function confirmJob() {
    void processLocally("Analyzing the job requirements...", () => {
      const job = confirmJobProfile(draftJob);
      const analysis = analyzeJobRequirements(job);
      invalidate(1);
      setData((prev) => ({ ...prev, job }));
      setDraftRequirements(analysis);
      go(1);
    });
  }
  function confirmRequirements() {
    void processLocally("Preparing your resume review...", () => {
      const requirements = confirmRequirementsProfile(draftRequirements);
      invalidate(2);
      setData((prev) => ({ ...prev, requirements }));
      go(2);
    });
  }
  function buildProfile(text, metadata = {}) {
    const profile = buildCandidateProfile(text, metadata);
    invalidate(2);
    setDraftCandidate(profile);
    setCandidateEdit(null);
  }
  async function upload(event) {
    event.preventDefault();
    if (!file) {
      setNotice({ type: "error", text: "Choose a PDF or DOCX resume first." });
      return;
    }
    invalidate(2);
    setDraftCandidate(null);
    setCandidateEdit(null);
    if (file.size >= 5 * 1024 * 1024) {
      setNotice({ type: "error", text: "Resume must be smaller than 5 MB." });
      return;
    }
    await fetchData(
      "/api/read-resume",
      {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-Resume-Name": encodeURIComponent(file.name),
        },
        body: file,
      },
      "Reading your resume…",
      (result) => {
        setDraftCandidate(
          buildCandidateProfile(result.text, {
            ...result.file,
            warnings: result.warnings,
          }),
        );
        if (result.warnings?.length)
          setNotice({ type: "info", text: result.warnings.join(" ") });
      },
    );
  }
  function confirmCandidate() {
    void processLocally("Preparing your email workspace...", () => {
      const candidate = confirmCandidateProfile(
        applyCandidateCorrections(
          draftCandidate,
          candidateEditorValues(draftCandidate),
          context,
          writing,
        ),
      );
      const relevance = confirmRelevanceProfile(
        matchProfiles(data.requirements, candidate),
        data.requirements,
        candidate,
      );
      invalidate(3);
      setData((prev) => ({ ...prev, candidate, relevance, email: null }));
      setDraftCandidate(candidate);
      go(3);
      void loadProviders();
    });
  }
  async function loadProviders() {
    setProviderState("loading");
    try {
      const response = await fetch("/api/ai-providers");
      if (!response.ok) throw new Error();
      const result = await response.json();
      setProviders(result.providers);
      setProviderState("ready");
    } catch {
      setProviderState("failed");
    }
  }
  function changePreference(key, value) {
    cancel();
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  }
  async function generate(feedbackOverride) {
    const revisionFeedback =
      typeof feedbackOverride === "string" ? feedbackOverride : feedback;
    if (generationInFlight.current || emailTyping) return;
    if (regenerationLimitReached) {
      setNotice({ type: "info", text: limitMessage });
      return;
    }
    generationInFlight.current = true;
    try {
      await fetchData(
        "/api/generate-email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job: data.job,
            requirements: data.requirements,
            candidate: data.candidate,
            relevance: data.relevance,
            additionalInformation: additional,
            ...preferences,
            ...(data.email && revisionFeedback.trim()
              ? {
                  feedback: revisionFeedback.trim(),
                  previousDraft: {
                    subject: data.email.subject,
                    body: emailBodyText(data.email),
                  },
                }
              : {}),
          }),
        },
        "Drafting and checking your email…",
        (result) => {
          if (
            typeof result.subject !== "string" ||
            typeof result.body !== "string" ||
            result.metadata?.status !== "verified"
          )
            throw new Error(
              "The provider returned an invalid draft. Please try again.",
            );
          result.metadata = {
            ...result.metadata,
            generation: generationCount + 1,
          };
          setVersions((prev) => [
            ...prev.map((v) =>
              v.email.metadata.generation === data.email?.metadata.generation
                ? { ...v, email: data.email, edited: emailEdited }
                : v,
            ),
            { email: result, original: result, edited: false },
          ]);
          animateNextEmail.current = true;
          setFeedback("");
          setTypedSubject("");
          setTypedBody("");
          setEmailTyping(true);
          setData((prev) => ({ ...prev, email: result }));
          setOriginalEmail(result);
          setEmailEdited(false);
          setGenerationCount((n) => n + 1);
          setNotice({
            type: "success",
            text:
              generationCount >= 2
                ? limitMessage
                : "Your draft passed factual checks. Please review it before use.",
          });
        },
        235000,
      );
    } finally {
      generationInFlight.current = false;
    }
  }
  async function copy(part) {
    try {
      await navigator.clipboard.writeText(
        part === "body" ? emailBodyText(data.email) : data.email[part],
      );
      setNotice({ type: "success", text: "Copied to clipboard." });
    } catch {
      setNotice({
        type: "error",
        text: "Clipboard unavailable. Select the text and copy it manually.",
      });
    }
  }
  function switchVersion(generation) {
    if (busy || emailTyping) return;
    const selected = versions.find(
      (v) => v.email.metadata.generation === Number(generation),
    );
    if (!selected) return;
    setVersions((prev) =>
      prev.map((v) =>
        v.email.metadata.generation === data.email?.metadata.generation
          ? { ...v, email: data.email, edited: emailEdited }
          : v,
      ),
    );
    animateNextEmail.current = false;
    setData((prev) => ({ ...prev, email: selected.email }));
    setOriginalEmail(selected.original);
    setEmailEdited(selected.edited);
    setFeedback("");
  }
  function saveCurrentEmail() {
    try {
      saveHistory(localStorage, data.email, emailEdited);
      setHistoryRevision((n) => n + 1);
      notify("Saved to History on this browser.");
      setNotice({
        type: "success",
        text: "Saved to History on this browser. You can view or delete it below.",
      });
    } catch (error) {
      notify(
        error.message.startsWith("History is full")
          ? error.message
          : "Could not save history. Check browser storage permissions or download a copy.",
        true,
      );
      setNotice({
        type: "error",
        text: error.message.startsWith("History is full")
          ? error.message
          : "Could not save history in this browser. Download the email to keep a copy.",
      });
    }
  }
  const unlocked = [
    true,
    !!data.job,
    !!data.requirements,
    !!data.candidate && !!data.relevance,
  ];
  const complete = [
    !!data.job,
    !!data.requirements,
    !!data.candidate,
    !!data.email,
  ];
  const current = stages[stage];
  const generationReady =
    providers.some((p) => p.id === preferences.provider && p.available) &&
    !(data.relevance?.missingApplicationInformation || []).some(
      (x) => !additional[x.key]?.trim(),
    );

  return (
    <div className="application-workspace min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="border-b border-white/10 bg-[#0e1014]/90 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-6 py-7">
          <Brand />
          <Link
            href="/"
            aria-label="Back to home"
            className="text-muted lg:hidden"
          >
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={newApplication}
            className="button-secondary w-full !justify-start !py-3 !text-xs"
          >
            <Plus size={15} />
            New application
          </button>
        </div>
        <p className="hidden px-7 pb-4 pt-4 text-[9px] font-semibold tracking-[.18em] text-muted lg:block">
          YOUR WORKSPACE
        </p>
        <nav
          aria-label="Application steps"
          className="flex gap-1 overflow-x-auto px-4 pb-4 lg:block lg:space-y-2"
        >
          {stages.map(({ name, short, icon: Icon }, i) => (
            <button
              key={name}
              disabled={!unlocked[i] || !!busy}
              aria-label={name}
              aria-current={stage === i ? "step" : undefined}
              onClick={() => go(i)}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-xs transition-colors lg:w-full ${stage === i ? "bg-lime/10 text-lime" : "text-muted hover:bg-white/5 hover:text-white"}`}
            >
              <Icon size={17} />
              <span className="lg:hidden">{short}</span>
              <span className="hidden lg:block">{name}</span>
              {complete[i] ? (
                <Check size={13} className="ml-auto text-lime" />
              ) : (
                <span className="ml-auto hidden font-mono text-[10px] opacity-50 lg:inline">
                  0{i + 1}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-5 p-5 lg:block">
          <div className="rounded-xl border border-white/10 p-4">
            <ShieldCheck size={19} className="mb-3 text-lime" />
            <p className="mb-2 text-xs font-medium">
              A little more intentional.
            </p>
            <p className="text-[11px] leading-5 text-muted">
              Unsaved information stays in this session. Refreshing clears your
              workspace.
            </p>
          </div>
          <Link
            href="/#questions"
            className="flex items-center gap-2 px-2 text-xs text-muted"
          >
            <CircleHelp size={15} />
            Questions & answers
            <ArrowUpRight size={12} className="ml-auto" />
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-20 items-center justify-between border-b border-white/10 px-6 sm:px-10">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Workspace</span>
            <ChevronRight size={12} />
            <span className="text-white/80">{current.name}</span>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-muted">
            <span className="size-1.5 rounded-full bg-lime" />
            Local workspace
          </span>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-6xl px-5 py-10 sm:px-10 lg:py-12"
        >
          <div className="mb-9">
            <p className="eyebrow">STEP 0{stage + 1} / 04</p>
            <h1
              ref={heading}
              tabIndex={-1}
              className="text-3xl font-medium tracking-[-.045em] outline-none sm:text-4xl"
            >
              {current.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              {current.subtitle}
            </p>
          </div>
          <div
            className="mb-8 flex gap-2"
            aria-label={`${complete.filter(Boolean).length} of 5 steps complete`}
          >
            {stages.map((x, i) => (
              <div
                key={x.name}
                className={`h-1 flex-1 rounded-full ${complete[i] ? "bg-lime" : stage === i ? "bg-lime/35" : "bg-white/10"}`}
              />
            ))}
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0 space-y-5">
              {notice && (
                <div
                  role={notice.type === "error" ? "alert" : "status"}
                  className={`rounded-lg border px-4 py-3 text-sm leading-6 ${notice.type === "error" ? "border-red-400/25 bg-red-400/5 text-red-200" : notice.type === "success" ? "border-lime/25 bg-lime/5 text-lime" : "border-white/15 bg-white/5 text-white/80"}`}
                >
                  {notice.text}
                </div>
              )}
              {busy && <ProcessingState label={busy} onCancel={cancel} />}
              {stage === 0 && (
                <>
                  <Panel
                    icon={Link2}
                    title="Bring your job link"
                    description="Every good application starts with understanding the opportunity."
                  >
                    <form onSubmit={extract} className="space-y-5">
                      <Field
                        label="LinkedIn job or hiring post URL"
                        value={url}
                        onChange={(value) => {
                          invalidate(0);
                          setUrl(value);
                          setDraftJob(null);
                          setSourceJob(null);
                          setManual(false);
                        }}
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        inputMode="url"
                        autoComplete="url"
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          className="button-primary"
                          disabled={!!busy || !url.trim()}
                          type="submit"
                        >
                          <PenLine size={15} />
                          Analyze opportunity
                          <ArrowRight size={15} />
                        </button>
                        <button
                          className="button-secondary"
                          type="button"
                          onClick={() => {
                            invalidate(0);
                            setUrl("");
                            setDraftJob(null);
                            setSourceJob(null);
                            setManual(false);
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </form>
                    <div className="my-6 border-t border-white/10" />
                    <p className="text-xs leading-6 text-muted">
                      Don’t have a public link, or the page won’t load?{" "}
                      <button
                        onClick={useManual}
                        className="text-lime underline decoration-lime/30 underline-offset-4"
                      >
                        Enter details manually
                      </button>
                    </p>
                  </Panel>
                  {draftJob && (
                    <Panel
                      title={
                        manual
                          ? "Add the job details"
                          : "Review the opportunity"
                      }
                      description="Correct anything that needs attention before confirming."
                    >
                      {sourceJob?.roles.length > 1 && (
                        <div className="mb-5">
                          <Field
                            label="Choose a role from this hiring post"
                            value={draftJob.selectedRoleId || ""}
                            onChange={(id) => {
                              invalidate(0);
                              setDraftJob(
                                id
                                  ? selectProfileRole(sourceJob, id)
                                  : sourceJob,
                              );
                            }}
                          >
                            <option value="">Select a role</option>
                            {sourceJob.roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.jobTitle}
                              </option>
                            ))}
                          </Field>
                        </div>
                      )}
                      <fieldset
                        disabled={draftJob.requiresRoleSelection || !!busy}
                        className="grid gap-4 sm:grid-cols-2"
                      >
                        {[
                          "jobTitle",
                          "companyName",
                          "location",
                          "experience",
                          "recruiterName",
                          "recruiterEmail",
                        ].map((key) => (
                          <Field
                            key={key}
                            label={`${humanize(key)}${key === "jobTitle" ? " (required)" : ""}`}
                            value={draftJob[key] || ""}
                            onChange={(value) => {
                              invalidate(0);
                              setDraftJob((prev) => ({
                                ...prev,
                                [key]: value,
                                confirmed: false,
                              }));
                            }}
                          />
                        ))}
                        <div className="sm:col-span-2">
                          <Field
                            label="Job description or hiring post (required)"
                            multiline
                            rows={10}
                            value={draftJob.jobSourceContent || ""}
                            onChange={(value) => {
                              invalidate(0);
                              setDraftJob((prev) => ({
                                ...prev,
                                jobSourceContent: value,
                                jobDescription: value,
                                confirmed: false,
                              }));
                            }}
                          />
                        </div>
                      </fieldset>
                      {!manual && (
                        <div className="my-5">
                          <Disclosure title="Source and extracted contact details">
                            <ProfileView
                              value={Object.fromEntries(
                                [
                                  "sourceUrl",
                                  "postAuthorName",
                                  "postAuthorHeadline",
                                  "authorProfileUrl",
                                  "publishedAt",
                                  "applicationEmails",
                                  "applicationLinks",
                                  "contactNumbers",
                                  "skills",
                                  "employmentType",
                                ].map((key) => [key, draftJob[key]]),
                              )}
                            />
                            {draftJob.originalPostContent && (
                              <p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-muted">
                                {draftJob.originalPostContent}
                              </p>
                            )}
                          </Disclosure>
                        </div>
                      )}
                      <div className="mt-6">
                        <Continue
                          onClick={confirmJob}
                          disabled={draftJob.requiresRoleSelection || !!busy}
                        >
                          Confirm job details
                        </Continue>
                      </div>
                    </Panel>
                  )}
                </>
              )}
              {stage === 1 && draftRequirements && (
                <Panel
                  icon={FileText}
                  title="Your requirements, clarified"
                  description="Review the findings and their evidence. Missing details remain unspecified."
                >
                  {analysisEdit ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        safely(() => {
                          setDraftRequirements(
                            applyAnalysisCorrections(
                              draftRequirements,
                              analysisEdit,
                            ),
                          );
                          setAnalysisEdit(null);
                        });
                      }}
                      className="space-y-4"
                    >
                      {Object.entries(analysisEdit).map(([key, val]) => (
                        <Field
                          key={key}
                          label={humanize(key)}
                          multiline={!["experience", "location"].includes(key)}
                          value={val}
                          onChange={(v) =>
                            setAnalysisEdit((prev) => ({ ...prev, [key]: v }))
                          }
                        />
                      ))}
                      <div className="flex gap-3">
                        <button className="button-primary">Save changes</button>
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => setAnalysisEdit(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="mb-5 subtle-panel">
                        <ProfileView value={draftRequirements.identity} />
                      </div>
                      <div className="space-y-3">
                        {Object.entries({
                          Skills: draftRequirements.technical,
                          Experience: draftRequirements.employment,
                          "Professional requirements":
                            draftRequirements.professional,
                          "Application instructions":
                            draftRequirements.application,
                        }).map(([label, value]) => (
                          <Disclosure
                            key={label}
                            title={label}
                            open={label === "Skills"}
                          >
                            <ProfileView value={value} />
                          </Disclosure>
                        ))}
                        <Disclosure title="Original source">
                          <p className="whitespace-pre-wrap text-xs leading-6 text-muted">
                            {draftRequirements.source.analyzedContent}
                          </p>
                        </Disclosure>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Continue
                          onClick={confirmRequirements}
                          disabled={!!busy}
                        >
                          Confirm requirements
                        </Continue>
                        <button
                          className="button-secondary"
                          onClick={() => {
                            invalidate(2);
                            setData((prev) => ({
                              ...prev,
                              requirements: null,
                            }));
                            setAnalysisEdit(
                              analysisEditorValues(draftRequirements),
                            );
                          }}
                        >
                          Edit analysis
                        </button>
                      </div>
                    </>
                  )}
                </Panel>
              )}
              {stage === 2 && (
                <>
                  <Panel
                    icon={Upload}
                    title="Bring your experience"
                    description="PDF or DOCX, smaller than 5 MB. Your file is processed in memory."
                  >
                    <form onSubmit={upload} className="space-y-4">
                      <label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-white/20 bg-black/10 px-5 py-7 text-center transition-colors hover:border-lime/50">
                        <Upload className="mb-3 text-lime" size={24} />
                        <span className="text-sm">
                          {file ? file.name : "Choose your resume"}
                        </span>
                        <span className="mb-4 mt-2 text-xs text-muted">
                          Text-based PDF or DOCX · No scanned documents
                        </span>
                        <input
                          aria-label="Resume file"
                          type="file"
                          ref={fileInput}
                          className="max-w-full text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
                          accept=".pdf,.docx"
                          onChange={(e) => {
                            invalidate(2);
                            setFile(e.target.files?.[0] || null);
                            setDraftCandidate(null);
                            setCandidateEdit(null);
                          }}
                        />
                      </label>
                      <button
                        className="button-primary"
                        disabled={!file || !!busy}
                      >
                        Read resume
                        <ArrowRight size={15} />
                      </button>
                    </form>
                    <div className="mt-6">
                      <Disclosure title="Enter your information manually">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            safely(() => {
                              if (!resumeText.trim())
                                throw new Error("Add your information first.");
                              buildProfile(resumeText);
                            });
                          }}
                          className="space-y-4"
                        >
                          <Field
                            label="Your experience"
                            multiline
                            rows={10}
                            maxLength={300000}
                            placeholder={
                              "Your name\nProfessional title\n\nExperience\nCompany and role\nDates and responsibilities\n\nSkills\nYour skills\n\nEducation\nYour education"
                            }
                            value={resumeText}
                            onChange={(value) => {
                              invalidate(2);
                              setResumeText(value);
                              setDraftCandidate(null);
                              setCandidateEdit(null);
                            }}
                          />
                          <button
                            className="button-secondary"
                            disabled={!!busy}
                          >
                            Build my profile
                          </button>
                        </form>
                      </Disclosure>
                    </div>
                  </Panel>
                  {draftCandidate && (
                    <Panel
                      title="Your profile, in your words"
                      description="Check extracted details, dates, and employment types. Edits are marked as user provided."
                    >
                      {candidateEdit ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            safely(() => {
                              setDraftCandidate(
                                applyCandidateCorrections(
                                  draftCandidate,
                                  candidateEdit,
                                  context,
                                  writing,
                                ),
                              );
                              setCandidateEdit(null);
                            });
                          }}
                          className="space-y-5"
                        >
                          <ProfileEditor
                            value={candidateEdit}
                            onChange={setCandidateEdit}
                          />
                          <div className="flex gap-3">
                            <button className="button-primary">
                              Save profile changes
                            </button>
                            <button
                              type="button"
                              className="button-secondary"
                              onClick={() => setCandidateEdit(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {Object.entries({
                              Identity: draftCandidate.identity,
                              Summary: draftCandidate.professionalSummary,
                              Experience: draftCandidate.experience,
                              Skills: draftCandidate.skills.items,
                              Projects: draftCandidate.projects,
                              Education: draftCandidate.education,
                              Certifications: draftCandidate.certifications,
                              Achievements: draftCandidate.achievements,
                            }).map(([label, value]) => (
                              <Disclosure
                                key={label}
                                title={label}
                                open={label === "Identity"}
                              >
                                <ProfileView value={value} />
                              </Disclosure>
                            ))}
                            <Disclosure title="Original resume text">
                              <p className="whitespace-pre-wrap text-xs leading-6 text-muted">
                                {draftCandidate.source.originalResumeText}
                              </p>
                            </Disclosure>
                          </div>
                          <button
                            className="button-secondary mt-5"
                            onClick={() => {
                              invalidate(2);
                              setCandidateEdit(
                                candidateEditorValues(draftCandidate),
                              );
                            }}
                          >
                            Edit profile
                          </button>
                        </>
                      )}
                    </Panel>
                  )}
                  <Panel
                    title="A little more context"
                    description="Optional details that can make your application more useful."
                  >
                    <Disclosure title="Availability, location & application details">
                      <div className="grid gap-4 sm:grid-cols-2">
                        {contextKeys.map((key) => (
                          <Field
                            key={key}
                            label={humanize(key)}
                            value={context[key] || ""}
                            maxLength={2000}
                            onChange={(value) => {
                              invalidate(2);
                              setContext((prev) => ({ ...prev, [key]: value }));
                            }}
                          />
                        ))}
                      </div>
                    </Disclosure>
                    <div className="mt-3">
                      <Disclosure title="Writing preferences & a previous email">
                        <div className="space-y-4">
                          <Field
                            label="Writing preferences"
                            multiline
                            maxLength={5000}
                            value={writing.preferences}
                            onChange={(value) => {
                              invalidate(2);
                              setWriting((prev) => ({
                                ...prev,
                                preferences: value,
                              }));
                            }}
                          />
                          <Field
                            label="Previous application email"
                            multiline
                            rows={6}
                            maxLength={20000}
                            value={writing.previousApplicationEmail}
                            onChange={(value) => {
                              invalidate(2);
                              setWriting((prev) => ({
                                ...prev,
                                previousApplicationEmail: value,
                              }));
                            }}
                          />
                          <p className="text-xs leading-6 text-muted">
                            This is writing context only. Claims in a previous
                            email are not added to your candidate facts.
                          </p>
                        </div>
                      </Disclosure>
                    </div>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Continue
                        onClick={confirmCandidate}
                        disabled={!draftCandidate || !!candidateEdit || !!busy}
                      >
                        Confirm my profile
                      </Continue>
                      <button
                        className="button-secondary"
                        onClick={() => {
                          invalidate(2);
                          setDraftCandidate(null);
                          setCandidateEdit(null);
                          setResumeText("");
                          setFile(null);
                          setContext({});
                          setWriting({
                            previousApplicationEmail: "",
                            preferences: "",
                          });
                        }}
                      >
                        Clear profile
                      </button>
                    </div>
                  </Panel>
                </>
              )}
              {stage === 3 && (
                <>
                  <Panel
                    icon={PenLine}
                    title="Make it sound like you"
                    description="Choose your provider, set the tone, and shape your introduction."
                  >
                    <div className="space-y-5">
                      {providerState === "loading" ? (
                        <p role="status" className="text-sm text-muted">
                          Checking available providers…
                        </p>
                      ) : providerState === "failed" ? (
                        <p role="alert" className="text-sm text-red-200">
                          Unable to check providers.{" "}
                          <button className="underline" onClick={loadProviders}>
                            Try again
                          </button>
                        </p>
                      ) : (
                        <>
                          <Field
                            label="AI provider"
                            value={preferences.provider}
                            onChange={(v) => changePreference("provider", v)}
                          >
                            <option value="">
                              Choose an available provider
                            </option>
                            {providers.map((p) => (
                              <option
                                key={p.id}
                                value={p.id}
                                disabled={!p.available}
                              >
                                {p.label}
                                {!p.available ? " · Not configured" : ""}
                              </option>
                            ))}
                          </Field>
                          {preferences.provider === "ollama" && (
                            <p className="text-xs leading-6 text-muted">
                              Local test model. Keep Ollama and the gateway
                              running (npm.cmd run llm). Generation may take a
                              few minutes; review the wording and facts before
                              using the email.
                            </p>
                          )}
                          {!providers.some((p) => p.available) && (
                            <p className="text-xs leading-6 text-muted">
                              No AI provider is configured. Add a cloud provider
                              key or OLLAMA_GATEWAY_API_KEY to the server
                              environment, then restart the app. Your reviewed
                              profiles remain available here.
                            </p>
                          )}
                          <button
                            className="text-xs text-muted underline underline-offset-4"
                            onClick={loadProviders}
                          >
                            Refresh provider availability
                          </button>
                        </>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label="Tone"
                          value={preferences.tone}
                          onChange={(v) => changePreference("tone", v)}
                        >
                          {["professional", "concise", "confident"].map((x) => (
                            <option key={x} value={x}>
                              {humanize(x)}
                            </option>
                          ))}
                        </Field>
                        <Field
                          label="Length"
                          value={preferences.length}
                          onChange={(v) => changePreference("length", v)}
                        >
                          <option value="standard">Standard</option>
                          <option value="short">Short</option>
                        </Field>
                      </div>
                      <Field
                        label="Anything you want to mention? (optional)"
                        multiline
                        maxLength={1500}
                        value={preferences.instruction}
                        onChange={(v) => changePreference("instruction", v)}
                        placeholder="Tell us what to emphasize or how you like to write."
                      />
                      {data.relevance.missingApplicationInformation.map(
                        (item) => (
                          <Field
                            key={item.key}
                            label={`${item.label} (requested by this role)`}
                            value={additional[item.key] || ""}
                            maxLength={500}
                            onChange={(v) => {
                              cancel();
                              setAdditional((prev) => ({
                                ...prev,
                                [item.key]: v,
                              }));
                              setData((prev) => ({ ...prev, email: null }));
                              setOriginalEmail(null);
                              setVersions([]);
                            }}
                          />
                        ),
                      )}
                      <p className="text-xs leading-6 text-muted">
                        When you generate, relevant confirmed information is
                        sent to your selected AI provider. Nothing is sent to
                        the employer.
                      </p>
                      {!data.email && (
                        <button
                          className="button-primary"
                          disabled={
                            !generationReady ||
                            !!busy ||
                            emailTyping ||
                            regenerationLimitReached
                          }
                          onClick={generate}
                        >
                          <PenLine size={15} />
                          {generationCount
                            ? `Generate again (${regenerationCount}/2)`
                            : "Generate application email"}
                        </button>
                      )}
                      {!data.email && regenerationLimitReached && (
                        <p role="status" className="text-xs text-muted">
                          {limitMessage}
                        </p>
                      )}
                    </div>
                  </Panel>
                  {data.email && (
                    <Panel
                      icon={Mail}
                      title="Your application email"
                      description={
                        emailEdited
                          ? "Manually edited. Your changes have not been checked."
                          : `Generation ${generationCount} · Passed factual checks against your confirmed information.`
                      }
                    >
                      <div className="space-y-5">
                        <Field
                          label="Version History"
                          value={
                            data.email.metadata?.generation || generationCount
                          }
                          onChange={switchVersion}
                          disabled={!!busy || emailTyping}
                        >
                          {versions.map((version) => (
                            <option
                              key={version.email.metadata.generation}
                              value={version.email.metadata.generation}
                            >
                              Generation {version.email.metadata.generation}
                              {version.edited ? " (edited)" : ""}
                            </option>
                          ))}
                        </Field>
                        {data.email.metadata?.usage && (
                          <p
                            className="text-xs leading-6 text-muted"
                            aria-label="Generation usage"
                          >
                            {data.email.metadata.usage.reportedCalls > 0
                              ? data.email.metadata.usage.totalTokens.toLocaleString() +
                                " tokens used" +
                                (data.email.metadata.usage.complete
                                  ? ""
                                  : " (partial usage reported)")
                              : "Token usage was not reported by the provider"}
                            {" ? " +
                              data.email.metadata.usage.providerCalls +
                              " AI calls for drafting, checking and any repairs."}
                            {data.email.metadata.provider === "bynara" && (
                              <>
                                {" "}
                                Remaining quota:{" "}
                                <a
                                  className="text-lime underline"
                                  href="https://router.bynara.id/usage"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  open Bynara usage dashboard
                                </a>{" "}
                                (sign in required).
                              </>
                            )}
                          </p>
                        )}
                        <Field
                          label="Subject"
                          maxLength={250}
                          value={
                            emailTyping ? typedSubject : data.email.subject
                          }
                          readOnly={emailTyping || !!busy}
                          aria-busy={emailTyping}
                          onChange={(value) => {
                            setData((prev) => ({
                              ...prev,
                              email: { ...prev.email, subject: value },
                            }));
                            setEmailEdited(true);
                          }}
                        />
                        <MarkdownEditor
                          key={data.email.metadata?.generation}
                          value={emailTyping ? typedBody : data.email.body}
                          format={data.email.bodyFormat || "plain"}
                          typing={emailTyping}
                          readOnly={emailTyping || !!busy}
                          onChange={(value, bodyFormat) => {
                            setData((prev) => ({
                              ...prev,
                              email: { ...prev.email, body: value, bodyFormat },
                            }));
                            setEmailEdited(true);
                          }}
                        />
                        {emailTyping && (
                          <p role="status" className="text-xs text-lime">
                            Writing your email
                            <span className="subject-cursor" aria-hidden="true">
                              {" "}
                              |
                            </span>
                          </p>
                        )}
                        {!emailTyping && !busy && (
                          <div
                            className="flex flex-wrap justify-end gap-2"
                            aria-label="Email actions"
                          >
                            <button
                              className="button-primary"
                              disabled={
                                !generationReady || regenerationLimitReached
                              }
                              onClick={generate}
                              aria-describedby={
                                regenerationLimitReached
                                  ? "regeneration-limit"
                                  : undefined
                              }
                            >
                              <RotateCcw size={13} /> Generate again (
                              {regenerationCount}/2)
                            </button>
                            <button
                              className="button-secondary"
                              onClick={() => copy("subject")}
                            >
                              <Copy size={13} /> Copy subject
                            </button>
                            <button
                              className="button-secondary"
                              onClick={() => copy("body")}
                            >
                              <Copy size={13} /> Copy email
                            </button>
                          </div>
                        )}
                        {!emailTyping && !busy && (
                          <>
                            <div className="space-y-3 rounded-lg border border-white/10 p-4">
                              <Field
                                label="Regeneration feedback"
                                multiline
                                rows={3}
                                maxLength={1000}
                                value={feedback}
                                onChange={setFeedback}
                                placeholder="Make it shorter, or add more about my Selenium experience?"
                                disabled={regenerationLimitReached}
                              />
                              <button
                                className="button-secondary"
                                disabled={
                                  !feedback.trim() ||
                                  !generationReady ||
                                  regenerationLimitReached
                                }
                                onClick={() => generate()}
                              >
                                Regenerate with feedback
                              </button>
                              <div
                                className="flex flex-wrap gap-2"
                                aria-label="One-click improvements"
                              >
                                {[
                                  [
                                    "More metrics",
                                    "Emphasize measurable outcomes already present in the confirmed resume. Never invent numbers, percentages, or achievements. If no metrics are supported, emphasize specific work instead.",
                                  ],
                                  [
                                    "Shorter",
                                    "Make the current email shorter and more concise, retaining required application details and supported facts.",
                                  ],
                                  [
                                    "Stronger opening",
                                    "Write a stronger, specific opening connecting my confirmed experience to this role. Avoid exaggeration and invented claims.",
                                  ],
                                ].map(([label, instruction]) => (
                                  <button
                                    key={label}
                                    className="button-secondary !px-3 !py-2 !text-xs"
                                    disabled={
                                      !generationReady ||
                                      regenerationLimitReached
                                    }
                                    onClick={() => generate(instruction)}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs leading-6 text-muted">
                                Feedback and improvement chips use the same
                                two-regeneration allowance. Metrics must come
                                from your confirmed experience.
                              </p>
                            </div>
                            <EmailExports
                              key={data.email.metadata?.generation}
                              email={data.email}
                              onSave={saveCurrentEmail}
                            />
                            <p className="text-xs leading-6 text-muted">
                              Save to History keeps this email on this browser
                              until you delete it. Unsaved versions clear on
                              refresh.
                            </p>
                          </>
                        )}
                        {regenerationLimitReached && !emailTyping && (
                          <p
                            id="regeneration-limit"
                            role="status"
                            className="text-right text-xs text-muted"
                          >
                            {limitMessage}
                          </p>
                        )}
                        {emailEdited && (
                          <button
                            className="flex items-center gap-2 text-xs text-muted"
                            onClick={() => {
                              setData((prev) => ({
                                ...prev,
                                email: originalEmail,
                              }));
                              setEmailEdited(false);
                            }}
                          >
                            <RotateCcw size={12} />
                            Restore original draft
                          </button>
                        )}
                        <p className="text-xs leading-6 text-muted">
                          Review before sending and attach your resume yourself.
                          Editing does not use another generation. Save to
                          History or download a copy before refreshing.
                        </p>
                      </div>
                    </Panel>
                  )}
                </>
              )}
              <SavedEmailHistory revision={historyRevision} />
              {stage > 0 && (
                <button
                  className="flex items-center gap-2 py-2 text-xs text-muted hover:text-white"
                  onClick={() => go(stage - 1)}
                >
                  <ArrowLeft size={13} />
                  Back to {stages[stage - 1].name.toLowerCase()}
                </button>
              )}
            </div>
            <aside className="space-y-5">
              <div className="rounded-xl border border-white/10 p-5">
                <p className="mb-5 text-[10px] font-semibold tracking-[.15em] text-muted">
                  A BETTER FIRST IMPRESSION
                </p>
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-lime/10 text-lime">
                  <current.icon size={19} />
                </div>
                <h2 className="mb-3 text-sm font-medium">
                  {
                    [
                      "Start with the source.",
                      "Clarity before confidence.",
                      "Your experience matters.",
                      "Your words, your call.",
                    ][stage]
                  }
                </h2>
                <p className="text-xs leading-6 text-muted">
                  {
                    [
                      "We read public job information. If a page is restricted, you can add the details manually.",
                      "Check the original evidence and correct any missing or ambiguous requirements.",
                      "Keep full-time roles, internships, and projects distinct. Review dates before confirming.",
                      "The draft is yours to refine. Copy it when you’re ready; HireDraft never sends on your behalf.",
                    ][stage]
                  }
                </p>
              </div>
              <div className="px-2">
                <div className="mb-2 flex items-center gap-2 text-xs text-white/70">
                  <CheckCheck size={14} className="text-lime" />
                  You review every step
                </div>
                <p className="text-[11px] leading-6 text-muted">
                  Changing an earlier step clears later results, so your
                  application always reflects your latest information.
                </p>
              </div>
            </aside>
          </div>
          <footer className="mt-14 flex items-center justify-between border-t border-white/10 pt-6 text-[10px] text-muted">
            <span>HireDraft · Made for your next chapter</span>
            <span className="hidden sm:inline">
              One opportunity. One thoughtful introduction.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
