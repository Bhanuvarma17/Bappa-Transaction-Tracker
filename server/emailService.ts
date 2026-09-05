import net from "net";
import tls from "tls";
import fs from "fs";
import path from "path";

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailServiceResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Mask an email for safe logging (e.g., "b***u@example.com")
 */
export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return "***";
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local.charAt(0)}***@${domain}`;
  }
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
}

/**
 * Lightweight native SMTP client using Node.js net/tls (zero external dependencies).
 */
async function sendViaSmtp(options: SendEmailOptions): Promise<EmailServiceResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const isSecure = process.env.SMTP_SECURE === "true" || port === 465;
  const from = process.env.EMAIL_FROM || `"Bappa Transaction Tracker" <noreply@${host || "example.com"}>`;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  return new Promise((resolve, reject) => {
    let socket: net.Socket;
    let buffer = "";
    let step = 0;

    const timeout = setTimeout(() => {
      if (socket) socket.destroy();
      reject(new Error("SMTP connection timed out."));
    }, 15000);

    const cleanup = () => {
      clearTimeout(timeout);
      if (socket && !socket.destroyed) socket.end();
    };

    const sendCommand = (cmd: string) => {
      socket.write(cmd + "\r\n");
    };

    const handleResponse = (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || ""; // keep incomplete trailing chunk

      for (const line of lines) {
        if (!line.trim()) continue;
        const code = parseInt(line.substring(0, 3), 10);
        const isMultline = line.charAt(3) === "-";
        if (isMultline) continue;

        if (code >= 400) {
          cleanup();
          return reject(new Error(`SMTP Error: ${line}`));
        }

        switch (step) {
          case 0: // Server greeting (220)
            if (code === 220) {
              step = 1;
              sendCommand(`EHLO ${host}`);
            }
            break;
          case 1: // EHLO response (250)
            if (code === 250) {
              if (!isSecure && port === 587) {
                // Issue STARTTLS
                step = 2;
                sendCommand("STARTTLS");
              } else {
                // Go straight to AUTH
                step = 4;
                sendCommand("AUTH LOGIN");
              }
            }
            break;
          case 2: // STARTTLS response (220)
            if (code === 220) {
              step = 3;
              // Upgrade connection to TLS
              const tlsSocket = tls.connect({
                socket,
                host,
                servername: host,
              }, () => {
                socket = tlsSocket;
                step = 1; // Send EHLO again over TLS
                sendCommand(`EHLO ${host}`);
              });

              tlsSocket.on("data", handleResponse);
              tlsSocket.on("error", (err) => {
                cleanup();
                reject(err);
              });
              return;
            }
            break;
          case 4: // AUTH LOGIN prompt for username (334)
            if (code === 334) {
              step = 5;
              sendCommand(Buffer.from(user).toString("base64"));
            }
            break;
          case 5: // AUTH LOGIN prompt for password (334)
            if (code === 334) {
              step = 6;
              sendCommand(Buffer.from(pass).toString("base64"));
            }
            break;
          case 6: // Authentication successful (235)
            if (code === 235) {
              step = 7;
              // Extract clean from address
              const matchFrom = from.match(/<([^>]+)>/);
              const cleanFrom = matchFrom ? matchFrom[1] : from;
              sendCommand(`MAIL FROM:<${cleanFrom}>`);
            }
            break;
          case 7: // MAIL FROM ok (250)
            if (code === 250) {
              step = 8;
              sendCommand(`RCPT TO:<${options.to}>`);
            }
            break;
          case 8: // RCPT TO ok (250)
            if (code === 250) {
              step = 9;
              sendCommand("DATA");
            }
            break;
          case 9: // DATA ready (354)
            if (code === 354) {
              step = 10;
              const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
              const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${host}>`;

              const mimeMessage = [
                `From: ${from}`,
                `To: <${options.to}>`,
                `Subject: ${options.subject}`,
                `Date: ${new Date().toUTCString()}`,
                `Message-ID: ${messageId}`,
                "MIME-Version: 1.0",
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                "",
                `--${boundary}`,
                "Content-Type: text/plain; charset=utf-8",
                "Content-Transfer-Encoding: 7bit",
                "",
                options.text,
                "",
                `--${boundary}`,
                "Content-Type: text/html; charset=utf-8",
                "Content-Transfer-Encoding: 7bit",
                "",
                options.html,
                "",
                `--${boundary}--`,
                ".",
              ].join("\r\n");

              sendCommand(mimeMessage);
            }
            break;
          case 10: // Queued / Sent (250)
            if (code === 250) {
              step = 11;
              sendCommand("QUIT");
              cleanup();
              resolve({ success: true, messageId: `smtp_${Date.now()}` });
            }
            break;
        }
      }
    };

    if (isSecure) {
      socket = tls.connect({ host, port, servername: host }, () => {
        // Connected directly with TLS
      });
    } else {
      socket = net.connect({ host, port }, () => {
        // Connected via plain TCP
      });
    }

    socket.on("data", handleResponse);
    socket.on("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}

/**
 * Fallback development mock mail recorder.
 * Writes to data/dev_mailbox.json in local dev when no SMTP credentials are provided,
 * allowing offline testing and development without revealing secrets or logging OTPs to stdout.
 */
function recordDevMail(options: SendEmailOptions): EmailServiceResult {
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const devMailFile = path.join(dataDir, "dev_mailbox.json");

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let records: any[] = [];
    if (fs.existsSync(devMailFile)) {
      try {
        records = JSON.parse(fs.readFileSync(devMailFile, "utf-8"));
      } catch {
        records = [];
      }
    }

    // Keep last 50 dev mail records
    records.unshift({
      id: `mail_${Date.now()}`,
      to: options.to,
      subject: options.subject,
      timestamp: new Date().toISOString(),
      text: options.text,
      html: options.html,
    });
    if (records.length > 50) records = records.slice(0, 50);

    fs.writeFileSync(devMailFile, JSON.stringify(records, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to record dev mail event:", err);
  }

  return { success: true, messageId: `dev_${Date.now()}` };
}

/**
 * Main Email Service Interface
 */
export const EmailService = {
  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  },

  async sendEmail(options: SendEmailOptions): Promise<EmailServiceResult> {
    if (this.isConfigured()) {
      try {
        return await sendViaSmtp(options);
      } catch (err: any) {
        console.error(`[EmailService] SMTP delivery error to ${maskEmail(options.to)}:`, err?.message || err);
        throw err;
      }
    }

    // Unconfigured SMTP fallback (dev / test mode)
    // NOTE: We NEVER log the OTP or password to console.
    console.log(`[EmailService] SMTP not configured. Recorded password reset email for ${maskEmail(options.to)} in data/dev_mailbox.json.`);
    return recordDevMail(options);
  },

  /**
   * Generates and delivers the password reset OTP email
   */
  async sendOtpEmail(toEmail: string, otp: string): Promise<EmailServiceResult> {
    const subject = "Bappa Transaction Tracker - Password Recovery OTP";

    const text = [
      "Bappa Transaction Tracker - Password Recovery",
      "",
      "Hello,",
      "",
      `Your one-time password (OTP) for password recovery is: ${otp}`,
      "",
      "This code is valid for exactly 10 minutes and can only be used once.",
      "If you did not request a password recovery, please ignore this message and ensure your account credentials remain secure.",
      "",
      "Regards,",
      "Bappa Transaction Tracker Security Team",
    ].join("\n");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Password Recovery OTP</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFFDFB; margin: 0; padding: 24px; color: #2D3436;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #F1F2F6; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
    <div style="background-color: #FF9933; padding: 24px 20px; text-align: center;">
      <div style="font-size: 28px; line-height: 1; margin-bottom: 6px;">🕉️</div>
      <h1 style="color: #FFFFFF; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">Bappa Transaction Tracker</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">Password Recovery Portal</p>
    </div>
    
    <div style="padding: 28px 24px;">
      <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #2D3436;">
        A request has been made to reset the password for your committee account.
      </p>
      
      <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #888888;">
        Your 6-Digit Verification Code:
      </p>
      
      <div style="background-color: #FFF9F2; border: 2px dashed #FF9933; border-radius: 12px; padding: 18px; text-align: center; margin: 12px 0 20px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FF9933; display: inline-block;">
          ${otp}
        </span>
      </div>
      
      <div style="background-color: #F8F9FA; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px; color: #666666; line-height: 1.5;">
        ⏱️ <strong>Valid for 10 minutes only.</strong> This code is single-use and will expire immediately after verification.
      </div>
      
      <p style="margin: 0; font-size: 11px; color: #999999; line-height: 1.5;">
        If you did not request this verification code, you can safely disregard this email. Your existing password has not been changed.
      </p>
    </div>
    
    <div style="border-top: 1px solid #F1F2F6; padding: 16px 24px; text-align: center; font-size: 11px; color: #AAAAAA;">
      Vinayaka Chavithi Committee Finance & Transparency Ledger
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail({
      to: toEmail,
      subject,
      text,
      html,
    });
  },
};
