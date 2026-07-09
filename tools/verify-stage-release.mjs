const serverUrl = (
  process.env.BONSUNG_API_BASE_URL ||
  process.env.NEXT_PUBLIC_BONSUNG_API_BASE_URL ||
  process.env.BONSUNG_SERVER_VERIFY_BASE_URL ||
  ""
).trim();

const allowTransitionFlags = process.env.BONSUNG_RELEASE_ALLOW_TRANSITION_FLAGS === "true";
const transitionFlags = [
  "NEXT_PUBLIC_ENABLE_APPS_SCRIPT_TRANSITION"
].filter((key) => process.env[key] === "true");

const errors = [];

if (!serverUrl) {
  errors.push("BONSUNG_API_BASE_URL must be set for 본성 스테이지 public deployment.");
} else {
  let parsed;
  try {
    parsed = new URL(serverUrl);
  } catch {
    errors.push("BONSUNG_API_BASE_URL must be a valid absolute URL.");
  }

  if (parsed) {
    if (parsed.protocol !== "https:") {
      errors.push("BONSUNG_API_BASE_URL must use https for public deployment.");
    }

    if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      errors.push("BONSUNG_API_BASE_URL must not point to a local development server for public deployment.");
    }
  }
}

if (!allowTransitionFlags && transitionFlags.length) {
  errors.push(
    `Transition-only flags must be disabled for public 본성 스테이지 deployment: ${transitionFlags.join(", ")}.`
  );
}

if (errors.length) {
  console.error("본성 스테이지 release configuration verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  console.error("Set BONSUNG_RELEASE_ALLOW_TRANSITION_FLAGS=true only for an explicitly approved transition drill.");
  process.exit(1);
}

console.log(`본성 스테이지 release configuration verified: ${serverUrl}`);
