import { NextResponse } from "next/server";
import { getNotifications } from "@/lib/actions/notifications";

export async function GET() {
  const data = await getNotifications();
  return NextResponse.json(data);
}
