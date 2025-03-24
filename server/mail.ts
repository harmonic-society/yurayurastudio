import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { NotificationEvent } from "@shared/schema";

const randomBytesAsync = promisify(randomBytes);

// メール送信用のトランスポーター設定
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// トークン生成関数
export async function generateVerificationToken(): Promise<string> {
  const buffer = await randomBytesAsync(32);
  return buffer.toString("hex");
}

// メール送信関数
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "メールアドレスの確認",
    html: `
      <h1>メールアドレスの確認</h1>
      <p>以下のリンクをクリックして、メールアドレスの確認を完了してください：</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
      <p>このリンクは24時間有効です。</p>
    `,
  });
}

// イベント別のメール件名を取得
export function getNotificationSubject(event: NotificationEvent): string {
  const subjects: Record<NotificationEvent, string> = {
    PROJECT_CREATED: "新しいプロジェクトが作成されました",
    PROJECT_UPDATED: "プロジェクトが更新されました",
    PROJECT_COMMENTED: "プロジェクトに新しいコメントがあります",
    PROJECT_COMPLETED: "プロジェクトが完了しました",
    REWARD_DISTRIBUTED: "報酬が分配されました",
  };
  return subjects[event];
}

// 通知メール送信
export async function sendNotificationEmail(
  email: string, 
  event: NotificationEvent, 
  data: { 
    title: string; 
    message: string; 
    link?: string; 
  }
): Promise<void> {
  const subject = getNotificationSubject(event);
  const linkHtml = data.link ? `<p><a href="${data.link}">詳細を見る</a></p>` : "";

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: subject,
    html: `
      <h1>${data.title}</h1>
      <p>${data.message}</p>
      ${linkHtml}
      <hr>
      <p>このメールはYura Yura Studioから自動送信されています。</p>
      <p>通知設定は<a href="${process.env.APP_URL}/settings">設定ページ</a>から変更できます。</p>
    `,
  });
}
