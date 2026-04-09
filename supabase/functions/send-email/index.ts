import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailPayload {
  type: 'app_approved' | 'app_rejected' | 'new_review' | 'welcome';
  recipientEmail: string;
  recipientName: string;
  appName?: string;
  appId?: string;
  reviewerName?: string;
  rating?: number;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email send');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'T Apps <noreply@tapps.app>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend: ${err}`);
  }
  return res.json();
}

function emailBase(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#10b981,#0d9488);padding:28px 32px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">T Apps</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Your App Marketplace</p>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:12px;">© 2026 T Apps · All rights reserved</p>
    </div>
  </div>
</body>
</html>`;
}

function appApprovedEmail(name: string, appName: string, appId: string) {
  return emailBase(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:32px;">🎉</span>
      </div>
      <h2 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">App Approved!</h2>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#475569;font-size:15px;line-height:1.6;">Great news! <strong>${appName}</strong> has been reviewed and approved. It is now live on T Apps and available to all users.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">✅ ${appName} is now live on the store</p>
    </div>
    <a href="${SUPABASE_URL.replace('.backend.onspace.ai', '.onspace.app')}/app/${appId}"
      style="display:block;text-align:center;background:#10b981;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:700;font-size:15px;margin-top:24px;">
      View Your App →
    </a>
  `);
}

function appRejectedEmail(name: string, appName: string) {
  return emailBase(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;background:#fee2e2;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:32px;">📋</span>
      </div>
      <h2 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">App Not Approved</h2>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#475569;font-size:15px;line-height:1.6;">After review, <strong>${appName}</strong> was not approved for the T Apps store at this time. Please review our developer guidelines and resubmit.</p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="margin:0;color:#9a3412;font-size:14px;">Common reasons include: incomplete screenshots, insufficient description, or content policy issues.</p>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.6;">You can update your app in the Developer Portal and resubmit for review.</p>
  `);
}

function newReviewEmail(name: string, appName: string, reviewerName: string, rating: number) {
  const stars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  return emailBase(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:64px;height:64px;background:#fef9c3;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <span style="font-size:32px;">⭐</span>
      </div>
      <h2 style="margin:0;font-size:22px;color:#0f172a;font-weight:700;">New Review</h2>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.6;">Hi <strong>${name}</strong>,</p>
    <p style="color:#475569;font-size:15px;line-height:1.6;"><strong>${reviewerName}</strong> just left a review on <strong>${appName}</strong>.</p>
    <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:28px;letter-spacing:4px;">${stars}</p>
      <p style="margin:8px 0 0;color:#64748b;font-size:14px;">${rating} out of 5 stars</p>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.6;">Log in to your Developer Portal to see the full review and respond.</p>
  `);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload: EmailPayload = await req.json();
    console.log('send-email invoked:', payload.type, payload.recipientEmail);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (payload.type) {
      case 'app_approved':
        await sendEmail(
          payload.recipientEmail,
          `🎉 "${payload.appName}" is now live on T Apps!`,
          appApprovedEmail(payload.recipientName, payload.appName!, payload.appId!)
        );
        break;
      case 'app_rejected':
        await sendEmail(
          payload.recipientEmail,
          `Update needed: "${payload.appName}" review`,
          appRejectedEmail(payload.recipientName, payload.appName!)
        );
        break;
      case 'new_review':
        await sendEmail(
          payload.recipientEmail,
          `⭐ New ${payload.rating}-star review on "${payload.appName}"`,
          newReviewEmail(payload.recipientName, payload.appName!, payload.reviewerName!, payload.rating!)
        );
        break;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
