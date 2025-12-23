import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  inviterEmail: string;
  inviteeEmail: string;
  action: "invited" | "accepted" | "declined";
  scheduledAt?: string;
  inviterName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send-invite-notification");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the user's JWT token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Invalid or expired token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { inviterEmail, inviteeEmail, action, scheduledAt, inviterName }: NotificationRequest = await req.json();
    
    console.log(`Processing notification: ${action} - inviter: ${inviterEmail}, invitee: ${inviteeEmail}`);

    if (!action || (action === "invited" && !inviteeEmail) || (action !== "invited" && !inviterEmail)) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const scheduledInfo = scheduledAt 
      ? `<p style="color: #666; margin: 16px 0;">Scheduled for: <strong>${new Date(scheduledAt).toLocaleString()}</strong></p>` 
      : "";

    let emailHtml: string;
    let subject: string;
    let recipient: string;

    if (action === "invited") {
      // New invite notification to invitee
      recipient = inviteeEmail;
      subject = "📬 You've Been Invited to a Mock Interview!";
      const senderName = inviterName || inviterEmail || "Someone";
      
      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Mock Interview Invitation 📬</h1>
              </div>
              <div style="padding: 32px;">
                <div style="background-color: #6366f115; border-left: 4px solid #6366f1; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #333; font-size: 16px;">
                    <strong>${senderName}</strong> has invited you to practice together in a mock interview session!
                  </p>
                </div>
                ${scheduledInfo}
                <p style="color: #666; margin: 16px 0;">Mock interviews are a great way to practice with a real partner. You'll get valuable feedback and build confidence for your actual interviews.</p>
                <div style="text-align: center; margin-top: 24px;">
                  <p style="color: #666; margin-bottom: 16px;">Log in to Interview Coach to accept or decline this invitation.</p>
                </div>
              </div>
              <div style="background-color: #f4f4f5; padding: 24px; text-align: center;">
                <p style="color: #888; margin: 0; font-size: 14px;">Interview Coach - Your AI-Powered Interview Prep Partner</p>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      // Accept/decline notification to inviter
      recipient = inviterEmail;
      const actionVerb = action === "accepted" ? "accepted" : "declined";
      const actionColor = action === "accepted" ? "#22c55e" : "#ef4444";
      const actionEmoji = action === "accepted" ? "✅" : "❌";
      subject = `${actionEmoji} Mock Interview Invite ${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)}`;

      emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Mock Interview Update ${actionEmoji}</h1>
              </div>
              <div style="padding: 32px;">
                <div style="background-color: ${actionColor}15; border-left: 4px solid ${actionColor}; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #333; font-size: 16px;">
                    <strong>${inviteeEmail}</strong> has <span style="color: ${actionColor}; font-weight: bold;">${actionVerb}</span> your mock interview invitation.
                  </p>
                </div>
                ${scheduledInfo}
                ${action === "accepted" ? `
                  <p style="color: #666; margin: 16px 0;">Great news! Your practice partner is confirmed. Make sure to prepare your questions and be ready at the scheduled time.</p>
                ` : `
                  <p style="color: #666; margin: 16px 0;">Don't worry! You can invite another practice partner or reschedule the session.</p>
                `}
              </div>
              <div style="background-color: #f4f4f5; padding: 24px; text-align: center;">
                <p style="color: #888; margin: 0; font-size: 14px;">Interview Coach - Your AI-Powered Interview Prep Partner</p>
              </div>
            </div>
          </body>
        </html>
      `;
    }

    console.log(`Sending email to ${recipient}`);
    
    // Use Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Interview Coach <onboarding@resend.dev>",
        to: [recipient],
        subject,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailData);
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in send-invite-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);