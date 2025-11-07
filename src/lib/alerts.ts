import { sendSystemEmail } from "./mailer";

type JobAlertStatus = "warning" | "error";

type JobAlertPayload = {
  jobId: string;
  status: JobAlertStatus;
  message: string;
  meta?: Record<string, any>;
};

async function postSlack(message: string, meta?: Record<string, any>) {
  const webhook = process.env.ALERT_SLACK_WEBHOOK_URL;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: message,
        blocks: [
          {
            type: "section",
            text: { type: "mrkdwn", text: message },
          },
          meta
            ? {
                type: "context",
                elements: [
                  {
                    type: "mrkdwn",
                    text: "```" + JSON.stringify(meta, null, 2) + "```",
                  },
                ],
              }
            : undefined,
        ].filter(Boolean),
      }),
    });
  } catch (error) {
    console.error("Failed to post Slack alert", error);
  }
}

async function sendEmail(message: string, meta?: Record<string, any>) {
  const to = process.env.ALERT_EMAIL_TO;
  if (!to) return;

  const subject = `[InvestoScope] Sync Alert`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; background: #0f172a; color: #e2e8f0;">
      <h2 style="color:#38bdf8;">Automated Job Alert</h2>
      <p style="font-size: 15px; line-height: 1.6;">${message}</p>
      ${
        meta
          ? `<pre style="background:#020617; padding:16px; border-radius:8px; color:#e2e8f0; overflow:auto;">${
              JSON.stringify(meta, null, 2)
            }</pre>`
          : ""
      }
      <p style="font-size: 12px; color:#94a3b8; margin-top: 24px;">This email was generated automatically. Configure ALERT_EMAIL_TO to disable.</p>
    </div>
  `;

  try {
    await sendSystemEmail({ to, subject, html });
  } catch (error) {
    console.error("Failed to send alert email", error);
  }
}

export async function sendJobAlert({ jobId, status, message, meta }: JobAlertPayload) {
  const decoratedMessage = `${status === "error" ? "❌" : "⚠️"} ${jobId}: ${message}`;
  await Promise.all([postSlack(decoratedMessage, meta), sendEmail(decoratedMessage, meta)]);
}


