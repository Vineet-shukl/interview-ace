import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid or expired token");
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    // Delete user data in order (respecting foreign key constraints)
    
    // 1. Delete body language metrics (linked to responses)
    const { data: responses } = await supabaseAdmin
      .from("interview_responses")
      .select("id")
      .eq("session_id", supabaseAdmin.from("interview_sessions").select("id").eq("user_id", userId));
    
    if (responses && responses.length > 0) {
      const responseIds = responses.map(r => r.id);
      await supabaseAdmin
        .from("body_language_metrics")
        .delete()
        .in("response_id", responseIds);
    }

    // 2. Delete interview responses (linked to sessions)
    const { data: sessions } = await supabaseAdmin
      .from("interview_sessions")
      .select("id")
      .eq("user_id", userId);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      await supabaseAdmin
        .from("interview_responses")
        .delete()
        .in("session_id", sessionIds);
    }

    // 3. Delete mock interview invites
    await supabaseAdmin
      .from("mock_interview_invites")
      .delete()
      .eq("inviter_id", userId);

    // 4. Delete interview sessions
    await supabaseAdmin
      .from("interview_sessions")
      .delete()
      .eq("user_id", userId);

    // 5. Delete user preferences
    await supabaseAdmin
      .from("user_preferences")
      .delete()
      .eq("user_id", userId);

    // 6. Delete user profile
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    // 7. Delete avatar from storage
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from("avatars")
      .list(userId);

    if (avatarFiles && avatarFiles.length > 0) {
      const filesToDelete = avatarFiles.map(f => `${userId}/${f.name}`);
      await supabaseAdmin.storage.from("avatars").remove(filesToDelete);
    }

    // 8. Finally, delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error(`Failed to delete auth user: ${deleteError.message}`);
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});