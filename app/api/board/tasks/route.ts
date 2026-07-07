import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getTasksBoardData } from "@/lib/queries/tasks-board";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const light = searchParams.get("light") === "true";

  const data = await getTasksBoardData({
    userId: session.user.id,
    isAdmin: session.user.role === "ADMIN",
    light,
  });

  return NextResponse.json(data);
}
