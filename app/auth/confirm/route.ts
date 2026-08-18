import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = new URL("/auth/update-password", request.url);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (token_hash) target.searchParams.set("token_hash", token_hash);
  if (type) target.searchParams.set("type", type);
  if (next) target.searchParams.set("next", next);

  return NextResponse.redirect(target);
}