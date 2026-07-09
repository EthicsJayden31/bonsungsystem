module.exports = async function handler(request, response) {
  try {
    restoreVercelRewriteUrl(request);
    const { handleStageNodeRequest } = await import("../../server/stage-core.mjs");
    return handleStageNodeRequest(request, response, { basePath: "/api/stage" });
  } catch (error) {
    const message = String(error?.message || "본성 스테이지 API startup failed.");
    const setupRequired = isSetupRequiredError(message);
    console.error("[bonsung-stage-api] startup failed", { setupRequired, message });
    response.statusCode = setupRequired ? 503 : 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");
    response.end(JSON.stringify({
      ok: false,
      error: setupRequired ? "stage_api_setup_required" : "stage_api_startup_failed",
      message: setupRequired ? message : "본성 스테이지 API startup failed."
    }));
  }
};

function restoreVercelRewriteUrl(request) {
  const currentUrl = new URL(request.url || "/", "http://stage.local");
  if (currentUrl.pathname !== "/api/stage/[...path]") return;
  const rewrittenPath = currentUrl.searchParams.get("path") || currentUrl.searchParams.get("...path") || "";
  currentUrl.searchParams.delete("path");
  currentUrl.searchParams.delete("...path");
  const suffix = rewrittenPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
  request.url = `/api/stage/${suffix}${currentUrl.search}`;
}

function isSetupRequiredError(message) {
  return [
    "missing required environment values",
    "Set BONSUNG_LOCAL_SERVER_PASSWORD",
    "Set BONSUNG_ADMIN_INITIAL_PASSWORD",
    "Set BONSUNG_ALLOWED_ORIGINS",
    "Set BONSUNG_STORAGE_DRIVER",
    "Set BONSUNG_LOCAL_DATA_FILE",
    "Keep 본성 스테이지 data backups enabled",
    "Google Sheets service account JSON",
    "BONSUNG_DATABASE_URL is required"
  ].some((pattern) => message.includes(pattern));
}
