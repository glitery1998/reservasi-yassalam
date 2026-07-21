import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dctnmdntqkncmvysgozd.supabase.co";
const supabaseKey = "sb_publishable_ykMOpF6wTJ6-tTXPIsBUMg_WgPSnX8a";

export const supabase = createClient(supabaseUrl, supabaseKey);