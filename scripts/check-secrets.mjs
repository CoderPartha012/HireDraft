// Check the files Git would publish. Report paths/rule names, never secret values.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";

const root = process.cwd();
let temporary;
const findings = [];
const add = (file, rule) => findings.push({ file, rule });
const gitOptions = {
  cwd: root,
  encoding: "utf8",
  stdio: ["pipe", "pipe", "pipe"],
  maxBuffer: 20 * 1024 * 1024,
};
let gitPrefix = [];
let repositoryPresent = false;
try {
  const top = execFileSync(
    "git",
    ["rev-parse", "--show-toplevel"],
    gitOptions,
  ).trim();
  repositoryPresent = path.resolve(top).toLowerCase() === root.toLowerCase();
} catch {
  /* A pre-initialization audit uses isolated temporary Git metadata. */
}

try {
  if (!repositoryPresent) {
    temporary = fs.mkdtempSync(
      path.join(os.tmpdir(), "hiredraft-publish-audit-"),
    );
    execFileSync("git", ["init", "--quiet", temporary], gitOptions);
    gitPrefix = [
      `--git-dir=${path.join(temporary, ".git")}`,
      `--work-tree=${root}`,
    ];
  }
  const git = (args, input) =>
    execFileSync("git", [...gitPrefix, ...args], { ...gitOptions, input });
  const files = [
    ...new Set(
      git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"])
        .split("\0")
        .filter(Boolean),
    ),
  ];
  for (const file of git([
    "ls-files",
    "--cached",
    "--ignored",
    "--exclude-standard",
    "-z",
  ])
    .split("\0")
    .filter(Boolean)) {
    add(file, "already-tracked-but-ignored");
  }

  const knownValues = new Set();
  const addEnv = (values) => {
    for (const [name, value] of Object.entries(values)) {
      if (
        /(?:TOKEN|SECRET|PASSWORD|API_KEY|DATABASE_URL)/i.test(name) &&
        value.length >= 8 &&
        !/^(your[_-]|replace|example|changeme|<)/i.test(value)
      )
        knownValues.add(value);
    }
  };
  addEnv(process.env);
  for (const name of fs.readdirSync(root)) {
    if (
      /^\.env(?:\.|$)/.test(name) &&
      name !== ".env.example" &&
      fs.statSync(path.join(root, name)).isFile()
    ) {
      addEnv(parseEnv(fs.readFileSync(path.join(root, name), "utf8")));
    }
  }
  const privateDir = path.join(root, "llm-gateway", "private");
  if (fs.existsSync(privateDir)) {
    for (const name of fs.readdirSync(privateDir)) {
      if (name.endsWith(".key")) {
        const value = fs
          .readFileSync(path.join(privateDir, name), "utf8")
          .trim();
        if (value.length >= 8) knownValues.add(value);
      }
    }
  }
  const patterns = [
    ["provider-token", /\bsk[-_][A-Za-z0-9_-]{24,}\b/],
    ["google-token", /\bAIza[\w-]{30,}\b/],
    [
      "github-token",
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
    ],
    ["aws-access-id", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
    ["gateway-token", /\bhd_[A-Za-z0-9_-]{40,}\b/],
    ["private-key", /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
    [
      "credential-url",
      /\b(?:https?|postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/:@]+:[^\s/@]{8,}@/i,
    ],
  ];
  function scan(file) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) return;
    const buffer = fs.readFileSync(absolute);
    // Exact known-value matching also covers otherwise unrecognized file formats.
    if ([...knownValues].some((value) => buffer.includes(Buffer.from(value))))
      add(file, "known-local-secret");
    if (buffer.includes(0)) return;
    const text = buffer.toString("utf8");
    for (const [rule, pattern] of patterns)
      if (pattern.test(text)) add(file, rule);
    if (path.basename(file) === ".env.example") {
      for (const [name, value] of Object.entries(parseEnv(text))) {
        if (
          /(?:TOKEN|SECRET|PASSWORD|API_KEY|DATABASE_URL)/i.test(name) &&
          value &&
          !/^(your[_-]|replace|example|changeme|<)/i.test(value)
        )
          add(file, "non-placeholder-template-value");
      }
    }
  }
  for (const file of files) scan(file);
  let browserFiles = 0;
  function scanBrowser(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) scanBrowser(absolute);
      else if (entry.isFile() && /\.(?:js|json|map)$/.test(entry.name)) {
        scan(path.relative(root, absolute));
        browserFiles++;
      }
    }
  }
  scanBrowser(path.join(root, ".next", "static"));
  console.log(
    JSON.stringify(
      {
        repositoryPresent,
        publishableFiles: files.length,
        browserFiles,
        findings,
      },
      null,
      2,
    ),
  );
  if (findings.length) process.exitCode = 1;
} finally {
  // This directory is created by this script in the OS temp directory only.
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
