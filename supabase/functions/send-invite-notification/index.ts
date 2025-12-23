import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  inviterEmail: string;
  inviteeEmail: string;
  action: "accepted" | "declined";
  scheduledAt?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send-invite-notification");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviterEmail, inviteeEmail, action, scheduledAt }: NotificationRequest = await req.json();
    
    console.log(`Processing notification: ${action} from ${inviteeEmail} to ${inviterEmail}`);

    if (!inviterEmail || !inviteeEmail || !action) {
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

    const actionVerb = action === "accepted" ? "accepted" : "declined";
    const actionColor = action === "accepted" ? "#22c55e" : "#ef4444";
    const actionEmoji = action === "accepted" ? "✅" : "❌";

    const scheduledInfo = scheduledAt 
      ? `<p style="color: #666; margin: 16px 0;">Scheduled for: <strong>${new Date(scheduledAt).toLocaleString()}</strong></p>` 
      : "";

    const emailHtml = `
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
                <div style="text-align: center; margin-top: 24px;">
                  <a href="#" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600;">View Session Details</a>
                </div>
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

    console.log(`Sending email to ${inviterEmail}`);
    
    // Use Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Interview Coach <onboarding@resend.dev>",
        to: [inviterEmail],
        subject: `${actionEmoji} Mock Interview Invite ${actionVerb.charAt(0).toUpperCase() + actionVerb.slice(1)}`,
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
  } catch (error: any) {
    console.error("Error in send-invite-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
