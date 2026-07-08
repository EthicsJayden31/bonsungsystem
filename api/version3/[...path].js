module.exports = async function handler(request, response) {
  try {
    restoreVercelRewriteUrl(request);
    const { handleVersion3NodeRequest } = await import("../../server/version3-core.mjs");
    return handleVersion3NodeRequest(request, response, { basePath: "/api/version3" });
  } catch (error) {
    const message = String(error?.message || "Version.3 API startup failed.");
    const setupRequired = isSetupRequiredError(message);
    response.statusCode = setupRequired ? 503 : 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end(JSON.stringify({
      ok: false,
      error: setupRequired ? "version3_api_setup_required" : "version3_api_startup_failed",
      message: setupRequired ? message : "Version.3 API startup failed."
    }));
  }
};

function restoreVercelRewriteUrl(request) {
  const currentUrl = new URL(request.url || "/", "http://version3.local");
  if (currentUrl.pathname !== "/api/version3/[...path]") return;
  const rewrittenPath = currentUrl.searchParams.get("path") || currentUrl.searchParams.get("...path") || "";
  currentUrl.searchParams.delete("path");
  currentUrl.searchParams.delete("...path");
  const suffix = rewrittenPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
  request.url = `/api/version3/${suffix}${currentUrl.search}`;
}

function isSetupRequiredError(message) {
  return [
    "missing required environment values",
    "Set VERSION3_LOCAL_SERVER_PASSWORD",
    "Set VERSION3_OWNER_INITIAL_PASSWORD",
    "Set VERSION3_ALLOWED_ORIGINS",
    "Set VERSION3_LOCAL_DATA_FILE",
    "Keep Version.3 data backups enabled",
    "VERSION3_DATABASE_URL is required"
  ].some((pattern) => message.includes(pattern));
}
