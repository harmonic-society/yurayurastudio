import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EmailJSSenderProps {
  recipientEmail?: string;
  subject?: string;
  message?: string;
}

export function EmailJSSender({ recipientEmail, subject = "テスト通知", message = "これはテスト通知メッセージです。" }: EmailJSSenderProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(recipientEmail || "");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailjsError, setEmailjsError] = useState<any>(null);
  const [serviceId, setServiceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [publicKey, setPublicKey] = useState("");

  const handleSendEmail = async () => {
    if (!serviceId || !templateId || !publicKey) {
      toast({
        title: "設定エラー",
        description: "EmailJSの設定情報が不足しています",
        variant: "destructive",
      });
      return;
    }

    if (!email) {
      toast({
        title: "入力エラー",
        description: "送信先メールアドレスを入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setEmailjsError(null);

    try {
      // EmailJSでメール送信
      const result = await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: email,
          subject: subject,
          message: message,
          app_name: "Yura Yura Studio",
          from_name: "Yura Yura Studio 通知",
        },
        publicKey
      );

      toast({
        title: "送信成功",
        description: `EmailJSを使用してメールを送信しました: ${email}`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error("EmailJS送信エラー:", error);
      setEmailjsError(error);
      toast({
        title: "送信エラー",
        description: "EmailJSでのメール送信に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <Mail className="h-4 w-4" />
        EmailJSで送信
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>EmailJSでテスト通知を送信</DialogTitle>
            <DialogDescription>
              EmailJSを使用してブラウザから直接メールを送信します。
              EmailJSのアカウント情報を入力してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="emailjs-service">Service ID</Label>
              <Input
                id="emailjs-service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                placeholder="service_xxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                EmailJSのダッシュボードで作成したサービスのID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailjs-template">Template ID</Label>
              <Input
                id="emailjs-template"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                placeholder="template_xxxxxxx"
              />
              <p className="text-xs text-muted-foreground">
                EmailJSのダッシュボードで作成したテンプレートのID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailjs-public-key">Public Key</Label>
              <Input
                id="emailjs-public-key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="XXXXXXXXXXXXXXXX"
              />
              <p className="text-xs text-muted-foreground">
                アカウント設定で確認できる公開キー
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailjs-recipient">送信先メールアドレス</Label>
              <Input
                id="emailjs-recipient"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                type="email"
              />
            </div>

            {emailjsError && (
              <div className="mt-4 p-4 bg-destructive/10 rounded border border-destructive/20">
                <h4 className="text-sm font-medium mb-2">エラー詳細</h4>
                <pre className="text-xs overflow-auto p-2 bg-muted rounded">
                  {JSON.stringify(emailjsError, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSendEmail} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  送信中...
                </>
              ) : (
                "送信"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}