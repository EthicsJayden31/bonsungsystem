import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
const dependencies = { ...(manifest.dependencies || {}), ...(manifest.devDependencies || {}) };
const errors = [];

const nextVersion = cleanVersion(dependencies.next);
const reactVersion = cleanVersion(dependencies.react);
const reactDomVersion = cleanVersion(dependencies["react-dom"]);
const nextEslintPluginVersion = cleanVersion(dependencies["@next/eslint-plugin-next"]);
const nextEslintConfigVersion = cleanVersion(dependencies["eslint-config-next"]);

if (!isAtLeast(nextVersion, "15.5.18")) {
  errors.push(`next must be at least 15.5.18 on the 15.x line. Current: ${dependencies.next || "missing"}`);
}

if (!isAtLeast(reactVersion, "19.2.6")) {
  errors.push(`react should be at least 19.2.6 for the current security baseline. Current: ${dependencies.react || "missing"}`);
}

if (!isAtLeast(reactDomVersion, "19.2.6")) {
  errors.push(`react-dom should be at least 19.2.6 for the current security baseline. Current: ${dependencies["react-dom"] || "missing"}`);
}

if (nextEslintPluginVersion !== nextVersion) {
  errors.push(`@next/eslint-plugin-next should match next. Current: ${dependencies["@next/eslint-plugin-next"] || "missing"}`);
}

if (nextEslintConfigVersion !== nextVersion) {
  errors.push(`eslint-config-next should match next. Current: ${dependencies["eslint-config-next"] || "missing"}`);
}

const nextConfig = readFileSync("next.config.ts", "utf8");
if (!nextConfig.includes("output: \"export\"")) {
  errors.push("next.config.ts should keep output: \"export\" for the GitHub Pages UI.");
}
if (!nextConfig.includes("isGithubPages ? { output: \"export\"")) {
  errors.push("next.config.ts should enable output: \"export\" only for GITHUB_PAGES=true so Vercel Functions can run.");
}
if (!nextConfig.includes("unoptimized: true")) {
  errors.push("next.config.ts should keep images.unoptimized=true to avoid the Next Image Optimization API in this static Pages UI.");
}

const productionEnvExample = readFileSync(".env.production.example", "utf8");
const lockfile = readFileSync("pnpm-lock.yaml", "utf8");
const legacyOwnerPasswordKey = ["VERSION3", "OWNER_INITIAL_PASSWORD"].join("_");
if (!productionEnvExample.includes("VERSION3_ADMIN_INITIAL_PASSWORD=")) {
  errors.push(".env.production.example must define VERSION3_ADMIN_INITIAL_PASSWORD.");
}
if (productionEnvExample.includes(`${legacyOwnerPasswordKey}=`)) {
  errors.push(`.env.production.example must not use the legacy ${legacyOwnerPasswordKey} name.`);
}
if (productionEnvExample.includes("VERSION3_DATABASE_URL=postgres://user:password@host:5432/database") && !productionEnvExample.includes("# VERSION3_DATABASE_URL=")) {
  errors.push(".env.production.example must not enable a real-looking database URL by default.");
}
if (!lockfile.includes("postcss@8.5.16")) {
  errors.push("pnpm-lock.yaml should resolve PostCSS to 8.5.16.");
}

if (errors.length) {
  console.error("Version.3 security baseline verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Version.3 security baseline verification passed.");

function cleanVersion(value) {
  return String(value || "").replace(/^[~^]/, "").trim();
}

function isAtLeast(actual, minimum) {
  const actualParts = actual.split(".").map((part) => Number(part));
  const minimumParts = minimum.split(".").map((part) => Number(part));
  if (actualParts.length < 3 || actualParts.some((part) => !Number.isInteger(part))) return false;
  for (let index = 0; index < minimumParts.length; index += 1) {
    if ((actualParts[index] || 0) > minimumParts[index]) return true;
    if ((actualParts[index] || 0) < minimumParts[index]) return false;
  }
  return true;
}
