import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://pkarhiefkvkaeecorhgy.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrYXJoaWVma3ZrYWVlY29yaGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTM3MTAsImV4cCI6MjA4ODM2OTcxMH0.LAt7eix-gb2lpCVrY-GHZAele4W03YWx8vPJ8BY_vU0";

export const supabase = createClient(supabaseUrl, supabaseKey);
