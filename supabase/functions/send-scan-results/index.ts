// send-scan-results Edge Function
// Retrieves customer email from Stripe session, sends scan results via Resend

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { session_id, scan_type, findings_summary, overall_score, document_name } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!STRIPE_SECRET_KEY || !RESEND_API_KEY) {
      console.error("Missing required secrets: STRIPE_SECRET_KEY or RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Retrieve customer email from Stripe
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      {
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!stripeRes.ok) {
      const stripeErr = await stripeRes.text();
      console.error("Stripe API error:", stripeErr);
      return new Response(JSON.stringify({ error: "Failed to retrieve session from Stripe" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSession = await stripeRes.json();
    const customerEmail = stripeSession.customer_details?.email || stripeSession.customer_email;

    if (!customerEmail) {
      console.error("No customer email found for session:", session_id);
      return new Response(JSON.stringify({ error: "No customer email found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Build and send email via Resend
    const score = Math.round(parseFloat(overall_score || 0));
    const scanLabel = scan_type === "worker" ? "Contract Check" : "Compliance Check";
    const riskLabel = score < 45 ? "High Risk" : score < 75 ? "Elevated Risk" : "Low Risk";
    const riskColor = score < 45 ? "#DC2626" : score < 75 ? "#D97706" : "#059669";

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#07090F;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <div style="padding:32px 32px 24px;border-bottom:2px solid #E8A923;">
        <div style="display:inline-block;width:24px;height:24px;background:#E8A923;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);vertical-align:middle;"></div>
        <span style="font-size:18px;font-weight:800;color:#EEF2FF;letter-spacing:-0.02em;vertical-align:middle;margin-left:10px;">Ailane</span>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h1 style="font-size:22px;font-weight:700;color:#EEF2FF;margin:0 0 8px;">Your ${scanLabel} Results</h1>
        <p style="font-size:14px;color:#8896AE;margin:0 0 28px;line-height:1.6;">Document: ${document_name}</p>

        <!-- Score -->
        <div style="background:#0C1018;border:1px solid #1B2236;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
          <div style="font-size:48px;font-weight:700;color:${riskColor};line-height:1;">${score}</div>
          <div style="font-size:12px;color:#536073;margin-bottom:12px;">/100</div>
          <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${riskColor};background:${score < 45 ? 'rgba(220,38,38,0.1)' : score < 75 ? 'rgba(217,119,6,0.1)' : 'rgba(5,150,105,0.1)'};padding:4px 12px;border-radius:4px;">${riskLabel}</div>
        </div>

        <!-- Summary -->
        <div style="background:#0C1018;border:1px solid #1B2236;border-radius:8px;padding:20px;margin-bottom:24px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#536073;margin-bottom:8px;">Findings Summary</div>
          <p style="font-size:14px;color:#8896AE;line-height:1.6;margin:0;">${findings_summary}</p>
        </div>

        <!-- What happens next -->
        <div style="background:#0C1018;border:1px solid #1B2236;border-radius:8px;padding:20px;margin-bottom:24px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#E8A923;margin-bottom:12px;">What happens next?</div>
          <ul style="font-size:14px;color:#8896AE;line-height:1.8;margin:0;padding-left:18px;">
            <li>Review the findings in your on-screen report</li>
            <li>Download and share the PDF report with your legal counsel</li>
            <li>Prioritise any critical or major items flagged</li>
            <li>Consult a qualified employment solicitor before acting on any finding</li>
          </ul>
        </div>

        <!-- Disclaimer -->
        <div style="border-left:3px solid #E8A923;padding-left:16px;margin-bottom:24px;">
          <p style="font-size:12px;color:#536073;line-height:1.6;margin:0;">This assessment is generated by AI-assisted analysis. It does not constitute legal advice and does not establish a professional relationship between you and AI Lane Limited. Always consult a qualified employment solicitor before acting on any finding.</p>
        </div>

        <!-- CTA -->
        <div style="text-align:center;">
          <a href="https://ailane.ai" style="display:inline-block;background:#E8A923;color:#07090F;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:6px;">Visit Ailane</a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:24px 32px;border-top:1px solid #1B2236;">
        <p style="font-size:11px;color:#536073;margin:0;line-height:1.6;">AI Lane Limited &middot; Company No. 17035654 &middot; Registered in England and Wales</p>
        <p style="font-size:11px;color:#536073;margin:4px 0 0;">ICO Registration: 00013389720</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Ailane <noreply@ailane.ai>",
        to: [customerEmail],
        subject: `Your ${scanLabel} Results — Score: ${score}/100`,
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const resendErr = await resendRes.text();
      console.error("Resend API error:", resendErr);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendData = await resendRes.json();
    console.log("Email sent successfully:", resendData.id, "to:", customerEmail);

    return new Response(JSON.stringify({ success: true, email_id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-scan-results error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
