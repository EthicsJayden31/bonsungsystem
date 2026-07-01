const serverUrl = (
  process.env.VERSION3_API_BASE_URL ||
  process.env.NEXT_PUBLIC_VERSION3_API_BASE_URL ||
  process.env.VERSION3_SERVER_VERIFY_BASE_URL ||
  ""
).trim();

const allowTransitionFlags = process.env.VERSION3_RELEASE_ALLOW_TRANSITION_FLAGS === "true";
const transitionFlags = [
  "NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION",
  "NEXT_PUBLIC_ENABLE_LEGACY_PREVIEW",
  "NEXT_PUBLIC_ENABLE_PREVIEW_LOGIN"
].filter((key) => process.env[key] === "true");

const errors = [];

if (!serverUrl) {
  errors.push("VERSION3_API_BASE_URL must be set for Version.3 public deployment.");
} else {
  let parsed;
  try {
    parsed = new URL(serverUrl);
  } catch {
    errors.push("VERSION3_API_BASE_URL must be a valid absolute URL.");
  }

  if (parsed) {
    if (parsed.protocol !== "https:") {
      errors.push("VERSION3_API_BASE_URL must use https for public deployment.");
    }

    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      errors.push("VERSION3_API_BASE_URL must not point to a local development server for public deployment.");
    }
  }
}

if (!allowTransitionFlags && transitionFlags.length) {
  errors.push(
    `Transition-only flags must be disabled for public Version.3 deployment: ${transitionFlags.join(", ")}.`
  );
}

if (errors.length) {
  console.error("Version.3 release configuration verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("Set VERSION3_RELEASE_ALLOW_TRANSITION_FLAGS=true only for an explicitly approved transition drill.");
  process.exit(1);
}

console.log(`Version.3 release configuration verified: ${serverUrl}`);
