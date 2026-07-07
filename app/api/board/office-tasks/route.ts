import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOfficeTasksBoardData } from "@/lib/queries/office-tasks-board-data";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sync = searchParams.get("sync") !== "false";

  const data = await getOfficeTasksBoardData({ sync });
  return NextResponse.json(data);
}
