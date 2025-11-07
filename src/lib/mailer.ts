import nodemailer from "nodemailer";

type ThankYouParams = {
  to: string;
  name?: string | null;
  provider?: string | null;
  isNewUser?: boolean | null;
};

type SystemEmailParams = {
  to: string;
  subject: string;
  html: string;
};

function getTransport() {
  const url = process.env.EMAIL_SERVER;
  if (!url) {
    throw new Error("EMAIL_SERVER is not configured");
  }

  return nodemailer.createTransport(url);
}

function buildHtml({ name, provider, isNewUser }: ThankYouParams) {
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi there,";
  const viaGoogle = provider === "google";
  const intro = viaGoogle
    ? "Thanks for signing in with Google — your InvestoScope dashboard is ready."
    : "Thanks for signing in with the secure magic link — you're all set inside InvestoScope.";

  const nextSteps = viaGoogle
    ? "Jump back into your dashboard any time with Google — no extra steps needed."
    : "Next time you want to sign in, just request a fresh link from the login page. It's the safest way to keep your account secure.";

  const extra = isNewUser
    ? "We’ve set up a clean workspace so you can start exploring portfolios, charts, and savings ideas instantly."
    : "We’ve refreshed your data so you can keep tracking your goals with confidence.";

  return `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #0f172a; padding: 32px; color: #f8fafc;">
    <div style="max-width: 520px; margin: 0 auto; background: rgba(15,23,42,0.6); border-radius: 16px; border: 1px solid rgba(148,163,184,0.2); overflow: hidden;">
      <div style="background: linear-gradient(135deg,#38bdf8,#6366f1); padding: 28px;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #0f172a;">Welcome back to InvestoScope</h1>
      </div>
      <div style="padding: 28px 32px;">
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">${greeting}</p>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">${intro}</p>
        <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6;">${extra}</p>
        <div style="margin: 28px 0; padding: 20px; background: rgba(59,130,246,0.12); border-radius: 12px; border: 1px solid rgba(59,130,246,0.3);">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #93c5fd;">What’s next?</h2>
          <ul style="padding-left: 20px; margin: 0; font-size: 15px; line-height: 1.7;">
            <li>Track fresh ideas tailored to your budget.</li>
            <li>Save favourites to revisit whenever inspiration hits.</li>
            <li>${nextSteps}</li>
          </ul>
        </div>
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #cbd5f5;">
          Have questions or want to share feedback? Just reply to this email — we read everything.
        </p>
        <p style="margin: 0; font-size: 15px; line-height: 1.6;">
          Stay curious,<br/>
          <strong>The InvestoScope Team</strong>
        </p>
      </div>
    </div>
    <p style="margin-top: 24px; font-size: 12px; color: #64748b; text-align: center;">
      You’re receiving this because you signed in to InvestoScope.
      If this wasn’t you, please secure your account immediately.
    </p>
  </div>
  `;
}

export async function sendThankYouEmail(params: ThankYouParams) {
  const { to } = params;
  if (!to) return;

  const transporter = getTransport();
  const fromAddress = process.env.EMAIL_FROM || "InvestoScope <no-reply@investoscope.app>";

  const subject = "You're signed in – welcome back to InvestoScope";
  const html = buildHtml(params);

  await transporter.sendMail({
    to,
    from: fromAddress,
    subject,
    html,
  });
}

export async function sendSystemEmail({ to, subject, html }: SystemEmailParams) {
  if (!to) return;
  const transporter = getTransport();
  const fromAddress = process.env.EMAIL_FROM || "InvestoScope <no-reply@investoscope.app>";
  await transporter.sendMail({ to, from: fromAddress, subject, html });
}

export async function sendPriceAlertEmail(params: {
  to: string;
  name?: string | null;
  optionName: string;
  symbol?: string | null;
  target: number;
  direction: "above" | "below";
  latestPrice: number;
  optionId: string;
}) {
  const { to, name, optionName, symbol, target, direction, latestPrice, optionId } = params;
  const transporter = getTransport();
  const fromAddress = process.env.EMAIL_FROM || "InvestoScope <no-reply@investoscope.app>";
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Hi there,";
  const dirStr = direction === "above" ? "above" : "below";
  const subject = `Price alert triggered for ${optionName}`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #0f172a; padding: 32px; color: #f1f5f9;">
      <div style="max-width: 520px; margin: 0 auto; background: rgba(15,23,42,0.6); border-radius: 16px; border: 1px solid rgba(148,163,184,0.2); overflow: hidden;">
        <div style="background: linear-gradient(135deg,#f472b6,#6366f1); padding: 26px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">Price alert triggered</h1>
        </div>
        <div style="padding: 26px 30px;">
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">${greeting}</p>
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
            <strong>${optionName}${symbol ? ` (${symbol})` : ''}</strong> just moved ${dirStr} your alert level of <strong>₹${target.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>.
          </p>
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">
            Latest traded price: <strong>₹${latestPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
          </p>
          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #cbd5f5;">
            This alert has been paused. Create a new one from the option page if you want to continue tracking it.
          </p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard/option/${encodeURIComponent(optionId)}" style="display:inline-block;margin-top:16px;padding:12px 18px;background:#6366f1;color:#0f172a;font-weight:600;border-radius:999px;text-decoration:none;">View option</a>
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    to,
    from: fromAddress,
    subject,
    html,
  });
}


