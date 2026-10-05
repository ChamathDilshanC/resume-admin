// Offline contract tests: real admin AI functions, mocked provider and GitHub transport.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const policy = require("../lib/resume-writing-policy.json");
let responseText;
let lastRequest;
const fakeFetch = async (_url, options) => {
  lastRequest = JSON.parse(options.body);
  return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: responseText }] } }] }) };
};
function load(relative, mocks = {}) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const localRequire = createRequire(filename);
  vm.runInNewContext(code, { exports, console, Buffer, fetch: fakeFetch,
    process: { env: { AI_API_KEY: "offline-test-key", ALLOWED_GITHUB_USERNAME: "candidate" } },
    require: (id) => Object.hasOwn(mocks, id) ? mocks[id] : localRequire(id),
  }, { filename });
  return exports;
}
async function main() {
  const corePolicy = path.resolve(root, "../resume-core/scripts/lib/resume-writing-policy.json");
  if (fs.existsSync(corePolicy)) assert.deepEqual(policy, JSON.parse(fs.readFileSync(corePolicy, "utf8")));
  const ai = load("lib/ai.ts");
  const project = { name: "Release Tool", description: "Package release automation", highlights: [], links: [],
    technologies: ["Shell"], role: "Contributor", evidence: { contribution: "Wrote shell release scripts", result: "Published packages" } };
  const target = { targetRole: "DevOps Engineer", jobDescription: "Deploy packages" };
  const draft = { description: "Package release automation.", highlights: ["Wrote shell scripts to publish packages."] };
  responseText = JSON.stringify(draft);
  assert.deepEqual(JSON.parse(JSON.stringify(await ai.generateProjectContent(project, target))), draft);
  const request = JSON.parse(lastRequest.contents[0].parts[0].text);
  assert.deepEqual(request.target, target);
  assert.deepEqual(request.project.evidence, project.evidence);
  assert(lastRequest.systemInstruction.parts[0].text.includes(policy.evidence));
  for (const bad of ['[]', '{"description":"x","highlights":[null]}', '{"description":"","highlights":[]}',
    JSON.stringify({ ...draft, highlights: [" "] }), JSON.stringify({ ...draft, highlights: Array(4).fill("Extra") })]) {
    responseText = bad;
    await assert.rejects(ai.generateProjectContent(project, target));
  }
  responseText = '["Reviewed pull requests."]';
  const work = { company: "Example", position: "Intern", highlights: ["Reviewed pull requests.", "Tested changes."], skillKeywords: [], target };
  await assert.rejects(ai.optimizeWorkHighlightsForAts(work), /number of work bullets/);
  responseText = '["Reviewed pull requests.","Tested changes."]';
  assert.equal((await ai.optimizeWorkHighlightsForAts(work)).length, 2);
  assert(lastRequest.contents[0].parts[0].text.includes("DevOps Engineer"));
  responseText = "Software developer who implemented release scripts. Contributed shell automation for publishing packages.";
  await ai.optimizeSummaryForAts({ label: target.targetRole, currentSummary: "Developer", skillKeywords: ["Shell"],
    workContext: "Contributed release scripts", projectContext: JSON.stringify(project), jobDescription: target.jobDescription });
  assert(lastRequest.contents[0].parts[0].text.includes("Wrote shell release scripts"));
  assert(!lastRequest.contents[0].parts[0].text.includes("Years Of Experience Anchor"));
  responseText = "";
  await assert.rejects(ai.optimizeSummaryForAts({ label: "", currentSummary: "", skillKeywords: [], workContext: "", projectContext: "" }));

  let captured;
  const actions = load("app/dashboard/actions.ts", {
    "next-auth": { getServerSession: async () => ({ accessToken: "offline" }) },
    "next/headers": {}, "@/lib/auth": {}, "@/lib/preview": {}, "@/lib/google-drive": {},
    "@/lib/google-drive-oauth": {}, "@/lib/crypto": {},
    "@/lib/github": { fetchProjectTechStack: async () => ({ name: "Release Tool", description: "Packages", techStack: "Shell",
      repoFullName: "candidate/release", url: "https://example.com/release" }) },
    "@/lib/ai": { generateProjectContent: async (p, t) => { captured = { project: p, target: t }; return draft; } },
  });
  const imported = await actions.generateProjectFromGithubRepo("release", { role: project.role, technologies: [" Shell ", "", "GitHub Actions"], evidence: project.evidence }, target);
  assert.equal(imported.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(captured.project.technologies)), ["Shell", "GitHub Actions"]);
  assert.deepEqual(captured.project.evidence, project.evidence);
  assert.deepEqual(captured.target, target);
  assert.equal(imported.project.description, draft.description);
  assert.equal(imported.project.repoFullName, "candidate/release");
  const edited = await actions.draftProjectAction(project, target);
  assert.equal(edited.ok, true);
  console.log("PASS: admin AI evidence/target transport, validation, work count, summary, GitHub import and existing-project drafts");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
