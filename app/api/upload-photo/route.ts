import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  // Must be signed in
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  const MIME_TO_EXT: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png":  "png",
    "image/webp": "webp",
    "image/gif":  "gif",
  };
  const ext = MIME_TO_EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Only JPEG, PNG, WebP, or GIF images allowed." }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "Max 5 MB." }, { status: 400 });

  const path = `${user.id}/${Date.now()}.${ext}`;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await admin.storage
    .from("rating-photos")
    .upload(path, await file.arrayBuffer(), {
      contentType:  file.type,
      cacheControl: "3600",
      upsert:       false,
    });

  if (error) { console.error("[upload-photo]", error.message); return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 }); }

  const { data: { publicUrl } } = admin.storage.from("rating-photos").getPublicUrl(data.path);
  return NextResponse.json({ url: publicUrl });
}
