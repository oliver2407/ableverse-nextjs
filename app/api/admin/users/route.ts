import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function adminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") ?? undefined;

  const users = await prisma.profile.findMany({
    where: role ? { role } : undefined,
    orderBy: { createdAt: "asc" },
    select: { id: true, displayName: true, role: true, isAdmin: true, isBanned: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const ctx = await requireAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  if (id === ctx.user.id) {
    return NextResponse.json({ error: "Cannot change your own admin status." }, { status: 400 });
  }

  const { isAdmin, role, isBanned } = await request.json();

  if (isBanned !== undefined && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = adminSupabase();
    await supabase.auth.admin.updateUserById(id, {
      ban_duration: isBanned ? "876600h" : "none",
    });
  }

  const profile = await prisma.profile.update({
    where: { id },
    data: {
      ...(isAdmin  !== undefined && { isAdmin }),
      ...(role     !== undefined && { role }),
      ...(isBanned !== undefined && { isBanned }),
    },
  });
  return NextResponse.json({ profile });
}
