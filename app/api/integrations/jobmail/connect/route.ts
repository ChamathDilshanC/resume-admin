import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const TOKEN_TTL_SECONDS = 10 * 60;
const OTP_BUCKET_SECONDS = 10 * 60;

function secret() {
  const value = process.env.JOBMAIL_INTEGRATION_SECRET;
  if (!value) throw new Error("JOBMAIL_INTEGRATION_SECRET is not configured");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function otpFor(accountId: string, bucket: number) {
  const digest = createHmac("sha256", secret()).update(`${accountId}:${bucket}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

function verifyToken(token: string) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expected = sign(encoded);
  const supplied = Buffer.from(suppliedSignature);
  const actual = Buffer.from(expected);
  if (supplied.length !== actual.length || !timingSafeEqual(supplied, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      accountId?: string;
      expiresAt?: number;
    };
    return payload.accountId && payload.expiresAt && payload.expiresAt > Date.now()
      ? payload
      : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const accountId = (session.user as { login?: string } | undefined)?.login || "ChamathDilshanC";
    const otp = otpFor(accountId, Math.floor(Date.now() / 1000 / OTP_BUCKET_SECONDS));
    const payload = Buffer.from(
      JSON.stringify({
        accountId,
        nonce: randomBytes(16).toString("hex"),
        expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
      }),
    ).toString("base64url");
    return NextResponse.json({ code: otp, token: `${payload}.${sign(payload)}`, expiresIn: TOKEN_TTL_SECONDS });
  } catch (error) {
    console.error("JobMail connection code generation failed", error);
    return NextResponse.json(
      { error: "Connection code is unavailable. Configure JOBMAIL_INTEGRATION_SECRET and redeploy DevResume." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.JOBMAIL_INTEGRATION_SECRET;
  const suppliedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredSecret || !suppliedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expected = Buffer.from(configuredSecret);
  const supplied = Buffer.from(suppliedSecret);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code, token } = await request.json().catch(() => ({}));
  const otp = typeof code === "string" ? code.replace(/\s/g, "") : "";
  const accountId = "ChamathDilshanC";
  const currentBucket = Math.floor(Date.now() / 1000 / OTP_BUCKET_SECONDS);
  const validOtp = /^[0-9]{6}$/.test(otp) &&
    [currentBucket, currentBucket - 1].some((bucket) => otp === otpFor(accountId, bucket));
  const payload = typeof token === "string" ? verifyToken(token) : validOtp ? { accountId } : null;
  if (!payload) return NextResponse.json({ error: "Invalid or expired connection code" }, { status: 400 });
  return NextResponse.json({ accountId: payload.accountId });
}
