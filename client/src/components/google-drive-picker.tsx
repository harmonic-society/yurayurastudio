import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { googleDriveConfig, isGoogleDriveConfigured } from '@/config/google-drive';

interface GoogleDrivePickerProps {
  onFileSelect: (file: {
    id: string;
    name: string;
    mimeType: string;
    url: string;
    size?: number;
  }) => void;
  disabled?: boolean;
}

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export default function GoogleDrivePicker({ onFileSelect, disabled }: GoogleDrivePickerProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const { apiKey, clientId } = googleDriveConfig;

  // デバッグ情報を出力
  console.log('GoogleDrivePicker initialized:', {
    apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET',
    clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET',
    env: import.meta.env.MODE,
    isConfigured: isGoogleDriveConfigured()
  });

  useEffect(() => {
    // APIキーとクライアントIDが設定されていない場合はスクリプトを読み込まない
    if (!apiKey || !clientId) {
      console.error('Google API credentials missing:', { apiKey: !!apiKey, clientId: !!clientId });
      setLoadingError('API認証情報が設定されていません');
      return;
    }

    let gapiLoadTimeout: NodeJS.Timeout;
    let gsiLoadTimeout: NodeJS.Timeout;

    // Google API スクリプトを読み込む
    const loadGapi = () => {
      if (!window.gapi) {
        console.log('Loading Google API script...');
        const script1 = document.createElement('script');
        script1.src = 'https://apis.google.com/js/api.js';
        script1.async = true;
        script1.defer = true;
        
        script1.onload = () => {
          console.log('Google API script loaded');
          clearTimeout(gapiLoadTimeout);
          setIsScriptLoaded(true);
          
          if (window.gapi) {
            window.gapi.load('picker', () => {
              console.log('Google Picker API loaded');
              setIsPickerApiLoaded(true);
            });
          } else {
            console.error('window.gapi not available after script load');
            setLoadingError('Google APIの初期化に失敗しました');
          }
        };
        
        script1.onerror = (error) => {
          console.error('Failed to load Google API script:', error);
          setLoadingError('Google APIスクリプトの読み込みに失敗しました');
          clearTimeout(gapiLoadTimeout);
        };
        
        document.body.appendChild(script1);
        
        // タイムアウト設定
        gapiLoadTimeout = setTimeout(() => {
          console.error('Google API script load timeout');
          setLoadingError('Google APIの読み込みがタイムアウトしました');
        }, 10000);
      } else {
        console.log('Google API already loaded, loading picker...');
        setIsScriptLoaded(true);
        window.gapi.load('picker', () => {
          console.log('Google Picker API loaded');
          setIsPickerApiLoaded(true);
        });
      }
    };

    // Google Identity Services スクリプトを読み込む
    const loadGsi = () => {
      if (!window.google?.accounts?.oauth2) {
        console.log('Loading Google Identity Services...');
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.async = true;
        script2.defer = true;
        
        script2.onload = () => {
          console.log('Google Identity Services loaded');
          clearTimeout(gsiLoadTimeout);
        };
        
        script2.onerror = (error) => {
          console.error('Failed to load Google Identity Services:', error);
          setLoadingError('Google認証サービスの読み込みに失敗しました');
          clearTimeout(gsiLoadTimeout);
        };
        
        document.body.appendChild(script2);
        
        // タイムアウト設定
        gsiLoadTimeout = setTimeout(() => {
          console.error('Google Identity Services load timeout');
          setLoadingError('Google認証サービスの読み込みがタイムアウトしました');
        }, 10000);
      } else {
        console.log('Google Identity Services already loaded');
      }
    };

    loadGapi();
    loadGsi();

    return () => {
      clearTimeout(gapiLoadTimeout);
      clearTimeout(gsiLoadTimeout);
    };
  }, [apiKey, clientId]);

  const handleOpenPicker = () => {
    console.log('Handle picker clicked:', {
      isPickerApiLoaded,
      hasGoogle: !!window.google,
      hasGoogleAccounts: !!window.google?.accounts,
      hasOAuth2: !!window.google?.accounts?.oauth2,
      apiKey: !!apiKey,
      clientId: !!clientId
    });

    if (!apiKey || !clientId) {
      alert('Google Drive連携の設定が不完全です。\n環境変数を確認してください。');
      return;
    }

    if (!isPickerApiLoaded) {
      alert('Google Picker APIの読み込み中です。しばらくお待ちください。');
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      alert('Google認証サービスが読み込まれていません。\nページを再読み込みしてください。');
      return;
    }

    try {
      console.log('Initializing OAuth2 token client...');
      // OAuth2トークンを取得
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse: any) => {
          console.log('OAuth2 token received');
          createPicker(tokenResponse.access_token);
        },
        error_callback: (error: any) => {
          console.error('OAuth2 error:', error);
          if (error.type === 'popup_closed') {
            alert('認証がキャンセルされました。');
          } else if (error.type === 'popup_failed_to_open') {
            alert('ポップアップブロッカーが有効になっています。\nポップアップを許可してください。');
          } else {
            alert(`Google認証エラー: ${error.type || 'unknown'}\n\nGoogle Cloud Consoleで本番環境のドメインが承認済みか確認してください。`);
          }
        },
      });

      console.log('Requesting access token...');
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('Failed to initialize OAuth2:', error);
      alert(`OAuth2初期化エラー: ${error}\n\n環境変数とGoogle Cloud Consoleの設定を確認してください。`);
    }
  };

  const createPicker = (accessToken: string) => {
    try {
      console.log('Creating picker with access token');
      
      if (!window.google?.picker) {
        throw new Error('Google Picker API not available');
      }
      
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .addView(new window.google.picker.DocsUploadView())
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback(pickerCallback)
        .setTitle('Google Drive からファイルを選択')
        .setLocale('ja')
        .build();
      
      console.log('Picker created, setting visible');
      picker.setVisible(true);
    } catch (error) {
      console.error('Failed to create picker:', error);
      alert(`ピッカー作成エラー: ${error}`);
    }
  };

  const pickerCallback = (data: any) => {
    console.log('Picker callback:', data);
    
    if (data.action === window.google.picker.Action.PICKED) {
      const file = data.docs[0];
      console.log('File selected:', file);
      
      // ファイル情報を親コンポーネントに渡す
      onFileSelect({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        url: file.url || `https://drive.google.com/file/d/${file.id}/view`,
        size: file.sizeBytes ? parseInt(file.sizeBytes) : undefined,
      });
    } else if (data.action === window.google.picker.Action.CANCEL) {
      console.log('Picker cancelled');
    }
  };

  // エラー状態を表示
  if (loadingError) {
    return (
      <div className="text-red-500 text-sm">
        {loadingError}
      </div>
    );
  }

  // APIキー・クライアントIDが設定されていない場合の警告表示
  if (!apiKey || !clientId) {
    return (
      <div className="text-amber-500 text-sm">
        Google Drive連携が未設定です。
        環境変数を確認してください。
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleOpenPicker}
      disabled={disabled}
      title={!isPickerApiLoaded ? "APIを読み込み中..." : "Google Driveからファイルを選択"}
    >
      <FolderOpen className="h-4 w-4 mr-2" />
      {!isPickerApiLoaded ? "読み込み中..." : "Google Drive から選択"}
    </Button>
  );
}