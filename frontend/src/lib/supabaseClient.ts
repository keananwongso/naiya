import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tfajvvrstvbhqqieygoz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmYWp2dnJzdHZiaHFxaWV5Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjA1NzksImV4cCI6MjA3OTQzNjU3OX0.vuHsLWQmwv53ww66hr7acgVgSvOZQQujvLB3nhWN8bg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
