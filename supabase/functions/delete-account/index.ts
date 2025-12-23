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
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Invalid or expired token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = user.id;
    console.log(`Deleting account for user: ${userId}`);

    // Delete user data in order (respecting foreign key constraints)
    
    // 1. First get all session IDs for this user
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("interview_sessions")
      .select("id")
      .eq("user_id", userId);

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
    }

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      console.log(`Found ${sessionIds.length} sessions to delete`);
      
      // 2. Get all response IDs for these sessions
      const { data: responses, error: responsesError } = await supabaseAdmin
        .from("interview_responses")
        .select("id")
        .in("session_id", sessionIds);

      if (responsesError) {
        console.error("Error fetching responses:", responsesError);
      }

      if (responses && responses.length > 0) {
        const responseIds = responses.map(r => r.id);
        console.log(`Found ${responseIds.length} responses to delete`);
        
        // 3. Delete body language metrics for these responses
        const { error: metricsError } = await supabaseAdmin
          .from("body_language_metrics")
          .delete()
          .in("response_id", responseIds);

        if (metricsError) {
          console.error("Error deleting body language metrics:", metricsError);
        } else {
          console.log("Deleted body language metrics");
        }
      }

      // 4. Delete interview responses for these sessions
      const { error: deleteResponsesError } = await supabaseAdmin
        .from("interview_responses")
        .delete()
        .in("session_id", sessionIds);

      if (deleteResponsesError) {
        console.error("Error deleting interview responses:", deleteResponsesError);
      } else {
        console.log("Deleted interview responses");
      }
    }

    // 5. Delete mock interview invites
    const { error: invitesError } = await supabaseAdmin
      .from("mock_interview_invites")
      .delete()
      .eq("inviter_id", userId);

    if (invitesError) {
      console.error("Error deleting mock interview invites:", invitesError);
    } else {
      console.log("Deleted mock interview invites");
    }

    // 6. Delete interview sessions
    const { error: deleteSessionsError } = await supabaseAdmin
      .from("interview_sessions")
      .delete()
      .eq("user_id", userId);

    if (deleteSessionsError) {
      console.error("Error deleting interview sessions:", deleteSessionsError);
    } else {
      console.log("Deleted interview sessions");
    }

    // 7. Delete user devices
    const { error: devicesError } = await supabaseAdmin
      .from("user_devices")
      .delete()
      .eq("user_id", userId);

    if (devicesError) {
      console.error("Error deleting user devices:", devicesError);
    } else {
      console.log("Deleted user devices");
    }

    // 8. Delete user preferences
    const { error: prefsError } = await supabaseAdmin
      .from("user_preferences")
      .delete()
      .eq("user_id", userId);

    if (prefsError) {
      console.error("Error deleting user preferences:", prefsError);
    } else {
      console.log("Deleted user preferences");
    }

    // 9. Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (profileError) {
      console.error("Error deleting user profile:", profileError);
    } else {
      console.log("Deleted user profile");
    }

    // 10. Delete avatar from storage
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from("avatars")
      .list(userId);

    if (avatarFiles && avatarFiles.length > 0) {
      const filesToDelete = avatarFiles.map(f => `${userId}/${f.name}`);
      const { error: storageError } = await supabaseAdmin.storage.from("avatars").remove(filesToDelete);
      if (storageError) {
        console.error("Error deleting avatar files:", storageError);
      } else {
        console.log("Deleted avatar files");
      }
    }

    // 11. Finally, delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete auth user: ${deleteError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Successfully deleted account for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error deleting account:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});