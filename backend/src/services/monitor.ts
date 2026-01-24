import { db } from "../db/client.js";
import { hooks } from "../db/schema.js";
import { eq, and, isNotNull } from "drizzle-orm";
import { config } from "../config.js";

async function sendAlertEmail(
  to: string,
  hookName: string,
  hookId: string,
  timeoutMinutes: number
): Promise<boolean> {
  // If no SendGrid API key is configured, log to console
  if (!config.sendgridApiKey) {
    console.log(
      `[Monitor Alert] Hook "${hookName}" (${hookId}) has not received webhooks for ${timeoutMinutes} minutes. Would send email to: ${to}`
    );
    return true;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.sendgridApiKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: `[Hookdump] Alert: No webhooks received for "${hookName}"`,
          },
        ],
        from: { email: config.emailFrom },
        content: [
          {
            type: "text/plain",
            value: `Your webhook endpoint "${hookName}" has not received any webhooks in the last ${timeoutMinutes} minutes.

Hook ID: ${hookId}
Timeout: ${timeoutMinutes} minutes

This could indicate:
- The external service stopped sending webhooks
- Network connectivity issues
- Configuration changes on the sending side

Please check your integration to ensure everything is working correctly.

---
Hookdump - Open Source Webhook Debugger
https://hookdump.dev`,
          },
          {
            type: "text/html",
            value: `
<h2>Webhook Alert</h2>
<p>Your webhook endpoint <strong>"${hookName}"</strong> has not received any webhooks in the last <strong>${timeoutMinutes} minutes</strong>.</p>

<table style="border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Hook ID</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;"><code>${hookId}</code></td>
  </tr>
  <tr>
    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timeout</strong></td>
    <td style="padding: 8px; border: 1px solid #ddd;">${timeoutMinutes} minutes</td>
  </tr>
</table>

<p>This could indicate:</p>
<ul>
  <li>The external service stopped sending webhooks</li>
  <li>Network connectivity issues</li>
  <li>Configuration changes on the sending side</li>
</ul>

<p>Please check your integration to ensure everything is working correctly.</p>

<hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
<p style="color: #666; font-size: 12px;">
  <a href="https://hookdump.dev">Hookdump</a> - Open Source Webhook Debugger
</p>`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Monitor] SendGrid error: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`[Monitor] Alert sent to ${to} for hook "${hookName}"`);
    return true;
  } catch (err) {
    console.error("[Monitor] Failed to send email:", err);
    return false;
  }
}

export async function checkMonitors(): Promise<void> {
  const now = new Date();

  // Find all hooks with monitoring enabled
  const monitoredHooks = await db
    .select()
    .from(hooks)
    .where(
      and(
        eq(hooks.monitorEnabled, true),
        isNotNull(hooks.monitorTimeoutMinutes),
        isNotNull(hooks.monitorNotifyEmail)
      )
    );

  for (const hook of monitoredHooks) {
    if (!hook.monitorTimeoutMinutes || !hook.monitorNotifyEmail) continue;

    const timeoutMs = hook.monitorTimeoutMinutes * 60 * 1000;
    const lastEvent = hook.lastEventAt ? new Date(hook.lastEventAt) : null;
    const lastAlert = hook.monitorLastAlertAt
      ? new Date(hook.monitorLastAlertAt)
      : null;

    // Check if we should alert
    let shouldAlert = false;

    if (!lastEvent) {
      // Never received an event - alert if hook is older than timeout
      const hookCreated = new Date(hook.createdAt);
      if (now.getTime() - hookCreated.getTime() > timeoutMs) {
        shouldAlert = true;
      }
    } else {
      // Check if last event is older than timeout
      if (now.getTime() - lastEvent.getTime() > timeoutMs) {
        shouldAlert = true;
      }
    }

    // Don't alert again if we already alerted recently (within timeout period)
    if (shouldAlert && lastAlert) {
      if (now.getTime() - lastAlert.getTime() < timeoutMs) {
        shouldAlert = false;
      }
    }

    if (shouldAlert) {
      const success = await sendAlertEmail(
        hook.monitorNotifyEmail,
        hook.name,
        hook.id,
        hook.monitorTimeoutMinutes
      );

      if (success) {
        // Update last alert time
        await db
          .update(hooks)
          .set({ monitorLastAlertAt: now.toISOString() })
          .where(eq(hooks.id, hook.id));
      }
    }
  }
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startMonitorService(): void {
  // Run every minute
  const intervalMs = 60 * 1000;

  console.log("[Monitor] Starting monitor service (checking every 1 minute)");

  // Run immediately on start
  checkMonitors().catch((err) => {
    console.error("[Monitor] Error checking monitors:", err);
  });

  // Then run periodically
  monitorInterval = setInterval(() => {
    checkMonitors().catch((err) => {
      console.error("[Monitor] Error checking monitors:", err);
    });
  }, intervalMs);
}

export function stopMonitorService(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log("[Monitor] Stopped monitor service");
  }
}
