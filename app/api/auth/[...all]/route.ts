// Better Auth routes: /api/auth/siwe/nonce, /api/auth/siwe/verify, /api/auth/get-session, /api/auth/sign-out.
import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/better-auth";

export async function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}
