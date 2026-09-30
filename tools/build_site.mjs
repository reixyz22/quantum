// Assembles the static site into dist/ and stamps it with the commit it came
// from. The stamp is what makes "did production actually update?" answerable
// by looking at the page instead of trusting the dashboard.
//
// This is also where the Python chapters will eventually plug in: they export
// their peeked state vectors to JSON, that JSON gets committed, and this build
// copies it in alongside the pages. Nothing here runs Python.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const SOURCE = "web";
const OUTPUT = "dist";

function commitSha() {
  // Vercel sets this during a build; fall back to local git for dev builds.
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

await rm(OUTPUT, { recursive: true, force: true });
await mkdir(OUTPUT, { recursive: true });
await cp(SOURCE, OUTPUT, { recursive: true });

const info = { commit: commitSha(), builtAt: new Date().toISOString() };
await writeFile(OUTPUT + "/build-info.json", JSON.stringify(info, null, 2) + "\n");

console.log(`built ${OUTPUT}/ from ${SOURCE}/ at commit ${info.commit}`);
