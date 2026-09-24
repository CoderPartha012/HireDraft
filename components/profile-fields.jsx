"use client";
import { useId } from "react";
import { Plus, Trash2 } from "lucide-react";

export const humanize = (key) =>
  key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (x) => x.toUpperCase());

export function Field({
  label,
  value,
  onChange,
  multiline = false,
  children,
  ...props
}) {
  const id = useId();
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children ? (
        <select
          id={id}
          className="field"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        >
          {children}
        </select>
      ) : multiline ? (
        <textarea
          id={id}
          className="field min-h-28 resize-y"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      ) : (
        <input
          id={id}
          className="field"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      )}
    </div>
  );
}

// Render evidence as text; documents and job descriptions never become HTML.
export function Evidence({ items = [] }) {
  if (!items.length) return null;
  return (
    <details className="mt-2 text-xs text-muted">
      <summary className="w-fit hover:text-lime">Source evidence</summary>
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <blockquote
            key={i}
            className="whitespace-pre-wrap border-l-2 border-lime/30 pl-3 leading-6"
          >
            {item.text || item.value || "Confirmed profile fact"}
            {item.context && <p className="text-white/40">{item.context}</p>}
          </blockquote>
        ))}
      </div>
    </details>
  );
}

const omitted = new Set([
  "id",
  "rawText",
  "schemaVersion",
  "ruleVersion",
  "confirmedAt",
  "generatedAt",
  "evidenceSections",
  "basis",
  "calculatedAsOf",
  "originalDateRange",
  "currentPosition",
]);
export function ProfileView({ value }) {
  if (value == null || value === "")
    return <span className="text-xs text-muted">Not specified</span>;
  if (typeof value !== "object")
    return (
      <span className="whitespace-pre-wrap break-words text-sm leading-6">
        {String(value)}
      </span>
    );
  if ("value" in value)
    return (
      <div>
        <span className="whitespace-pre-wrap break-words text-sm leading-6">
          {String(value.value)}
          {value.unit ? ` ${value.unit}` : ""}
        </span>
        <span className="ml-2 text-[10px] text-lime/80">
          {value.source === "user_provided" || value.origin === "user"
            ? "User provided"
            : value.source === "calculated"
              ? "Calculated"
              : value.userConfirmed
                ? "Confirmed"
                : ""}
        </span>
        <Evidence items={value.evidence} />
      </div>
    );
  if (Array.isArray(value))
    return value.length ? (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="border-l border-white/10 pl-3">
            <ProfileView value={item} />
          </div>
        ))}
      </div>
    ) : (
      <span className="text-xs text-muted">Not specified</span>
    );
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {Object.entries(value)
        .filter(([key]) => !omitted.has(key))
        .map(([key, item]) => (
          <div
            key={key}
            className={
              Array.isArray(item) ||
              (item && typeof item === "object" && !("value" in item))
                ? "sm:col-span-2"
                : ""
            }
          >
            <dt className="mb-1 text-[11px] text-muted">{humanize(key)}</dt>
            <dd>
              <ProfileView value={item} />
            </dd>
          </div>
        ))}
    </dl>
  );
}

const templates = {
  positions: {
    company: "",
    jobTitle: "",
    employmentType: "other",
    startDate: "",
    endDate: "",
    location: "",
    responsibilities: [],
    achievements: [],
    technologies: [],
  },
  projects: {
    name: { value: "" },
    description: [],
    technologies: [],
    features: [],
    achievements: [],
  },
  education: {
    degree: { value: "" },
    specialization: { value: "" },
    institution: { value: "" },
    startYear: { value: "" },
    graduationYear: { value: "" },
    score: { value: "" },
  },
  certifications: {
    name: { value: "" },
    issuer: { value: "" },
    date: { value: "" },
  },
};
const records = new Set(Object.keys(templates));

export function ProfileEditor({ value, onChange, name = "Profile" }) {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "value" in value
  )
    return (
      <Field
        label={humanize(name)}
        value={value.value}
        onChange={(v) => onChange({ ...value, value: v })}
      />
    );
  if (Array.isArray(value)) {
    if (!records.has(name) && value.every((item) => typeof item === "string"))
      return (
        <Field
          label={`${humanize(name)} (one per line)`}
          multiline
          value={value.join("\n")}
          onChange={(v) => onChange(v.split("\n"))}
        />
      );
    return (
      <fieldset className="space-y-4 rounded-lg border border-white/10 p-4">
        <legend className="px-2 text-sm font-medium">{humanize(name)}</legend>
        {value.map((item, i) => (
          <div key={i} className="space-y-4 border-b border-white/10 pb-4">
            <ProfileEditor
              name={`${humanize(name)} ${i + 1}`}
              value={item}
              onChange={(next) =>
                onChange(value.map((x, j) => (j === i ? next : x)))
              }
            />
            <button
              type="button"
              className="inline-flex items-center gap-2 text-xs text-muted hover:text-red-300"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <Trash2 size={13} />
              Remove {humanize(name).toLowerCase()} {i + 1}
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button-secondary !py-2 !text-xs"
          onClick={() =>
            onChange([
              ...value,
              structuredClone(templates[name] || { value: "" }),
            ])
          }
        >
          <Plus size={13} />
          Add {humanize(name).toLowerCase()}
        </button>
      </fieldset>
    );
  }
  if (value && typeof value === "object")
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(value)
          .filter(([key]) => !omitted.has(key))
          .map(([key, item]) => (
            <div
              key={key}
              className={
                item && typeof item === "object" && !("value" in item)
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <ProfileEditor
                name={key}
                value={item}
                onChange={(v) => onChange({ ...value, [key]: v })}
              />
            </div>
          ))}
      </div>
    );
  if (name === "employmentType")
    return (
      <Field label="Employment type" value={value} onChange={onChange}>
        <option value="full_time">Full time</option>
        <option value="internship">Internship</option>
        <option value="other">Other / unspecified</option>
      </Field>
    );
  return (
    <Field
      label={humanize(name)}
      value={value || ""}
      onChange={(v) => onChange(v)}
    />
  );
}
