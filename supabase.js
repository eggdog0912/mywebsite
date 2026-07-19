import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabaseUrl = "https://ubgnsvlxiblnemspkyur.supabase.co";

const supabaseKey = "sb_publishable_9EFkdPpTB7k3ljsrWEHoqA_9t_Yb6NE";

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log("✅ Supabase bağlandı!");