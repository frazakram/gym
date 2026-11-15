import net from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "@/lib/email";

/**
 * Minimal in-process SMTP server: enough of RFC 5321 for an authenticated,
 * plaintext submission. Records the envelope, auth and message data.
 */
type ReceivedMail = { authLine: string | null; mailFrom: string; rcptTo: string[]; data: string };

function startSmtpSink(): Promise<{ port: number; received: ReceivedMail[]; close: () => Promise<void> }> {
  const received: ReceivedMail[] = [];
  const server = net.createServer((socket) => {
    let current: ReceivedMail = { authLine: null, mailFrom: "", rcptTo: [], data: "" };
    let readingData = false;
    let buffer = "";
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply("220 sink.test ESMTP");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newline: number;
      while ((newline = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        if (readingData) {
          if (line === ".") {
            readingData = false;
            received.push(current);
            current = { authLine: current.authLine, mailFrom: "", rcptTo: [], data: "" };
            reply("250 OK queued");
          } else {
            current.data += `${line.startsWith("..") ? line.slice(1) : line}\n`;
          }
          continue;
        }
        const command = line.toUpperCase();
        if (command.startsWith("EHLO")) reply("250-sink.test\r\n250 AUTH PLAIN");
        else if (command.startsWith("HELO")) reply("250 sink.test");
        else if (command.startsWith("AUTH PLAIN")) {
          current.authLine = Buffer.from(line.slice("AUTH PLAIN ".length), "base64").toString("utf8");
          reply("235 Authentication successful");
        } else if (command.startsWith("MAIL FROM:")) {
          current.mailFrom = line.slice(10).trim();
          reply("250 OK");
        } else if (command.startsWith("RCPT TO:")) {
          current.rcptTo.push(line.slice(8).trim());
          reply("250 OK");
        } else if (command === "DATA") {
          readingData = true;
          reply("354 End data with <CR><LF>.<CR><LF>");
        } else if (command === "QUIT") {
          reply("221 Bye");
          socket.end();
        } else reply("250 OK");
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as net.AddressInfo;
      resolve({ port, received, close: () => new Promise((done) => server.close(() => done())) });
    });
  });
}

let sink: Awaited<ReturnType<typeof startSmtpSink>>;

beforeEach(async () => {
  sink = await startSmtpSink();
  vi.stubEnv("SMTP_HOST", "127.0.0.1");
  vi.stubEnv("SMTP_PORT", String(sink.port));
  vi.stubEnv("SMTP_SECURE", "false");
  vi.stubEnv("SMTP_USER", "mailer@gymbro.test");
  vi.stubEnv("SMTP_PASS", "smtp-password");
  vi.stubEnv("SMTP_FROM", "GymBro AI <no-reply@gymbro.test>");
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await sink.close();
});

describe("sendEmail (SMTP)", () => {
  it("authenticates and delivers one message with the expected envelope and content", async () => {
    await sendEmail({
      to: "coach@example.com",
      subject: "New coach booking request",
      text: "A user requested a session.",
      html: "<p>A user requested a <b>session</b>.</p>",
      replyTo: "user@example.com",
    });

    expect(sink.received).toHaveLength(1);
    const [mail] = sink.received;
    expect(mail.authLine).toBe("\u0000mailer@gymbro.test\u0000smtp-password");
    expect(mail.mailFrom).toBe("<no-reply@gymbro.test>");
    expect(mail.rcptTo).toEqual(["<coach@example.com>"]);
    expect(mail.data).toMatch(/^From: GymBro AI <no-reply@gymbro\.test>$/m);
    expect(mail.data).toMatch(/^To: coach@example\.com$/m);
    expect(mail.data).toMatch(/^Reply-To: user@example\.com$/m);
    expect(mail.data).toMatch(/^Subject: New coach booking request$/m);
    expect(mail.data).toContain("A user requested a session.");
    expect(mail.data).toContain("<b>session</b>");
  });

  it("refuses to send when SMTP is not configured", async () => {
    vi.stubEnv("SMTP_HOST", "");
    await expect(sendEmail({ to: "a@example.com", subject: "x", text: "y" })).rejects.toThrow("SMTP_HOST is not set");
    expect(sink.received).toHaveLength(0);
  });
});
