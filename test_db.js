require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
supabase
  .from("advisor_schedules")
  .select("*")
  .limit(1)
  .then(({ data, error }) => {
    if (error) console.error(error);
    console.log(JSON.stringify(data, null, 2));
  });
