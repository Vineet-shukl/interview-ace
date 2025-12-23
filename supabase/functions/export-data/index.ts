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
    console.log(`Exporting data for user: ${userId}`);

    // Collect all user data
    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        emailConfirmedAt: user.email_confirmed_at,
      },
    };

    // 1. Get profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    exportData.profile = profile;

    // 2. Get preferences
    const { data: preferences } = await supabaseAdmin
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    exportData.preferences = preferences;

    // 3. Get interview sessions with responses
    const { data: sessions } = await supabaseAdmin
      .from("interview_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    exportData.interviewSessions = sessions || [];

    // 4. Get interview responses for all sessions
    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map(s => s.id);
      const { data: responses } = await supabaseAdmin
        .from("interview_responses")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false });
      
      exportData.interviewResponses = responses || [];

      // 5. Get body language metrics for all responses
      if (responses && responses.length > 0) {
        const responseIds = responses.map(r => r.id);
        const { data: metrics } = await supabaseAdmin
          .from("body_language_metrics")
          .select("*")
          .in("response_id", responseIds);
        
        exportData.bodyLanguageMetrics = metrics || [];
      }
    }

    // 6. Get mock interview invites (sent by user)
    const { data: sentInvites } = await supabaseAdmin
      .from("mock_interview_invites")
      .select("*")
      .eq("inviter_id", userId);
    
    exportData.mockInterviewInvitesSent = sentInvites || [];

    // Calculate summary statistics
    const interviewSessions = exportData.interviewSessions as { overall_score?: number | null }[] | undefined;
    const sessionsWithScores = interviewSessions?.filter((s) => s.overall_score !== null) ?? [];
    exportData.summary = {
      totalSessions: (exportData.interviewSessions as unknown[])?.length || 0,
      totalResponses: (exportData.interviewResponses as unknown[])?.length || 0,
      totalInvitesSent: (exportData.mockInterviewInvitesSent as unknown[])?.length || 0,
      averageSessionScore: sessionsWithScores.length > 0
        ? sessionsWithScores.reduce((sum: number, s) => sum + (s.overall_score || 0), 0) / sessionsWithScores.length
        : 0,
    };

    console.log(`Successfully exported data for user: ${userId}`);

    return new Response(
      JSON.stringify(exportData, null, 2),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="intervue-data-export-${new Date().toISOString().split('T')[0]}.json"`,
          ...corsHeaders 
        },
      }
    );
  } catch (error) {
    console.error("Error exporting data:", error);
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