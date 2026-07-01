import { NextResponse } from "next/server";
import { after } from "next/server";
import { getSession } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { PAGE_LABELS } from "@/lib/constants";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const page = typeof body.page === "string" ? body.page : undefined;
  if (!page) return NextResponse.json({ ok: false }, { status: 400 });

  const userId = session.user.id;
  const label = PAGE_LABELS[page] ?? page;

  after(() =>
    logActivity(userId, "PAGE_VIEW", page, `${label} sayfasını açtı`)
  );

  return NextResponse.json({ ok: true });
}
