import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase.storage.createBucket("rating-photos", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (error) {
    if (error.message.includes("already exists")) {
      console.log("Bucket 'rating-photos' already exists — nothing to do.");
    } else {
      console.error("Error:", error.message);
      process.exit(1);
    }
  } else {
    console.log("Created bucket:", data.name);
  }
}

main();
