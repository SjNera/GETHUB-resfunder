import { describe, expect, it } from "vitest";
import { appUrl, trustedOrigins } from "./better-auth";

const env = (e: Record<string, string>) => e as NodeJS.ProcessEnv;

describe("appUrl", () => {
  it("uses BETTER_AUTH_URL when set, without a trailing slash", () => {
    expect(appUrl(env({ BETTER_AUTH_URL: "https://resfunder.example/", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" }))).toBe(
      "https://resfunder.example",
    );
  });

  it("uses the production domain on a Vercel production deployment", () => {
    expect(appUrl(env({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "resfunder.vercel.app", VERCEL_URL: "resfunder-abc.vercel.app" }))).toBe(
      "https://resfunder.vercel.app",
    );
  });

  it("uses the branch URL on a preview, then the deployment URL", () => {
    expect(appUrl(env({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "resfunder-git-ui.vercel.app", VERCEL_URL: "resfunder-abc.vercel.app" }))).toBe(
      "https://resfunder-git-ui.vercel.app",
    );
    expect(appUrl(env({ VERCEL_ENV: "preview", VERCEL_URL: "resfunder-abc.vercel.app" }))).toBe("https://resfunder-abc.vercel.app");
  });

  it("falls back to localhost for local dev", () => {
    expect(appUrl(env({}))).toBe("http://localhost:3000");
    expect(appUrl(env({ PORT: "3001" }))).toBe("http://localhost:3001");
  });
});

describe("trustedOrigins", () => {
  it("lists each Vercel address once", () => {
    expect(
      trustedOrigins(env({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "b.vercel.app", VERCEL_URL: "d.vercel.app", VERCEL_PROJECT_PRODUCTION_URL: "p.vercel.app" })),
    ).toEqual(["https://b.vercel.app", "https://p.vercel.app", "https://d.vercel.app"]);
  });
});
