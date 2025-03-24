import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { NotificationEvent } from "@shared/schema";

const randomBytesAsync = promisify(randomBytes);

// SMTPの設定が存在するか確認する関数
function hasSmtpConfig(): boolean {
  return !!(
    process.env.SMTP_HOST && 
    process.env.SMTP_PORT && 
    process.env.SMTP_USER && 
    process.env.SMTP_PASS
  );
}

// メール送信用のトランスポーター設定
// 環境変数が設定されていない場合は、ethereal.emailのテストアカウントを使用するか、
// コンソールに出力する
let transporter: nodemailer.Transporter;

if (hasSmtpConfig()) {
  // 実際のSMTPサーバーを使用
  console.log("📧 SMTP設定を使用します:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ? "設定済み" : "未設定",
    pass: process.env.SMTP_PASS ? "設定済み" : "未設定",
    from: process.env.SMTP_FROM || "未設定"
  });
  
  // Gmail向け特別設定
  if (process.env.SMTP_HOST?.includes('gmail.com')) {
    console.log("📧 Gmail設定を使用します");
    transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // 465ポートの場合はtrue
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // アプリパスワードを使用
      },
      tls: {
        // Gmailは正しい証明書を持っているので、ここはtrueのままにします
        rejectUnauthorized: true,
      },
      debug: true,
      logger: true
    });
  } else {
    console.log("📧 カスタムSMTP設定を使用します");
    
    // Node.js環境変数で強制的にTLSセキュリティレベルを下げる（重要：これはセキュリティリスクがあります）
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    // 通常のSMTP設定
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // 自己署名証明書を許可
        minVersion: 'TLSv1', // TLSの最小バージョンを下げる
        ciphers: 'DEFAULT:!DH' // DHキーを使用しない
      },
      debug: true, // デバッグログを有効化
      logger: true // コンソールに詳細ログを出力
    });
  }
} else {
  // テスト用のトランスポーター（コンソールにログ出力するだけ）
  console.log("⚠️ SMTP設定が見つかりません。メールはコンソールに出力されます。");
  
  transporter = {
    sendMail: async (mailOptions: any) => {
      console.log("\n📧 メール送信をシミュレート:");
      console.log("From:", mailOptions.from || "開発者@example.com");
      console.log("To:", mailOptions.to);
      console.log("Subject:", mailOptions.subject);
      console.log("HTML Content:", mailOptions.html);
      console.log("\n");
      
      return { messageId: `test-${Date.now()}` };
    }
  } as any;
}

// トークン生成関数
export async function generateVerificationToken(): Promise<string> {
  const buffer = await randomBytesAsync(32);
  return buffer.toString("hex");
}

// メール送信関数
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
  const verificationUrlWithFallback = `${appUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@yurayurastudio.com',
    to: email,
    subject: "メールアドレスの確認",
    html: `
      <h1>メールアドレスの確認</h1>
      <p>以下のリンクをクリックして、メールアドレスの確認を完了してください：</p>
      <a href="${verificationUrlWithFallback}">${verificationUrlWithFallback}</a>
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
    REGISTRATION_APPROVED: "登録リクエストが承認されました",
    PROJECT_ASSIGNED: "プロジェクトにアサインされました",
  };
  return subjects[event];
}

// メール送信、3つの方法を試行
export async function sendNotificationEmail(
  email: string, 
  event: NotificationEvent, 
  data: { 
    title: string; 
    message: string; 
    link?: string; 
  }
): Promise<void> {
  try {
    console.log(`📧 メール送信を開始します: ${email}, イベント: ${event}`);
    
    const subject = getNotificationSubject(event);
    const linkHtml = data.link ? `<p><a href="${data.link}">詳細を見る</a></p>` : "";

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const settingsUrl = `${appUrl}/settings`;

    // 迷惑メールフィルタ対策のための適切なHTML構造
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            color: #2c3e50;
            margin-top: 0;
            font-size: 24px;
          }
          .message {
            margin: 20px 0;
          }
          .cta {
            background-color: #3498db;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 4px;
            display: inline-block;
            margin: 10px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${data.title}</h1>
          <div class="message">
            <p>${data.message}</p>
          </div>
          ${linkHtml ? `<a href="${data.link}" class="cta">詳細を見る</a>` : ''}
          <div class="footer">
            <p>このメールは<strong>Yura Yura Studio</strong>からの自動送信メールです。</p>
            <p>通知設定は<a href="${settingsUrl}">設定ページ</a>から変更できます。</p>
            <p>© ${new Date().getFullYear()} Yura Yura Studio. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 迷惑メール対策としてヘッダーを強化
    const appName = "Yura Yura Studio";
    const fromName = process.env.SMTP_FROM_NAME || 'Yura Yura Studio';
    const fromEmail = process.env.SMTP_FROM || 'noreply@yurayurastudio.com';
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: subject,
      html: htmlContent,
      // 迷惑メール対策用のヘッダー
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        "Importance": "High",
        "X-Mailer": `Yura Yura Studio (Node.js ${process.version})`,
        "List-Unsubscribe": `<${process.env.APP_URL || 'https://yurayurastudio.com'}/settings>`
      }
    };
    
    console.log("📧 メール送信オプション:", { 
      from: mailOptions.from, 
      to: mailOptions.to, 
      subject: mailOptions.subject 
    });
    
    // 送信を試みます
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("📧 メール送信成功:", info.messageId);
      return info;
    } catch (error: any) {
      console.error("📧 SMTP送信エラー:", error);
      
      // Gmailの特殊なエラーのハンドリング
      if (process.env.SMTP_HOST?.includes('gmail.com')) {
        if (error.message?.includes('Invalid login')) {
          console.error("📧 Gmail認証エラー: ユーザー名またはパスワードが無効です。アプリパスワードを使用していることを確認してください。");
        } else if (error.message?.includes('Server busy')) {
          console.error("📧 Gmailサーバービジー: しばらく待ってから再試行してください。");
        } else if (error.message?.includes('rate limit')) {
          console.error("📧 Gmail送信レート制限: 送信制限に達しました。しばらく待ってから再試行してください。");
        }
      }
      
      // テスト用にコンソールには常に表示
      console.log("\n📧 メール送信失敗時のコンテンツ表示:");
      console.log("To:", email);
      console.log("Subject:", subject);
      console.log("HTML Content:", htmlContent);
      console.log("\n");
      
      // エラーをスローして呼び出し元で処理できるようにする
      throw {
        message: error.message || 'メール送信エラー',
        code: error.code,
        response: error.response,
        responseCode: error.responseCode,
        smtpProvider: process.env.SMTP_HOST?.includes('gmail.com') ? 'Gmail' : 'カスタムSMTP'
      };
    }
  } catch (error) {
    console.error("📧 メール送信エラー:", error);
    throw error;
  }
}
