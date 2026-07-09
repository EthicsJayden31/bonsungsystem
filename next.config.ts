import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const githubPagesExport = isGithubPages ? { output: "export" as const } : {};
const vercelRuntimeRedirects = isGithubPages
  ? {}
  : {
      async redirects() {
        return [
          {
            source: "/",
            destination: "/login",
            permanent: false
          }
        ];
      }
    };

const nextConfig: NextConfig = {
  ...githubPagesExport,
  ...vercelRuntimeRedirects,
  trailingSlash: isGithubPages,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? "/bonsungsystem" : ""
  },
  basePath: isGithubPages ? "/bonsungsystem" : undefined,
  assetPrefix: isGithubPages ? "/bonsungsystem/" : undefined
};

export default nextConfig;
