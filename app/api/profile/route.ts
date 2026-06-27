import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ role: null, isAdmin: false });
    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    return NextResponse.json({ role: profile?.role ?? "community", isAdmin: profile?.isAdmin ?? false });
  } catch {
    return NextResponse.json({ role: null, isAdmin: false });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { displayName } = await request.json();
    if (!displayName?.trim()) {
      return NextResponse.json({ error: "displayName is required." }, { status: 400 });
    }
    if (displayName.trim().length > 50) {
      return NextResponse.json({ error: "Display name must be 50 characters or fewer." }, { status: 400 });
    }

    await prisma.profile.upsert({
      where:  { id: user.id },
      update: { displayName: displayName.trim() },
      create: { id: user.id, displayName: displayName.trim(), role: "community" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[PATCH /api/profile]", message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
