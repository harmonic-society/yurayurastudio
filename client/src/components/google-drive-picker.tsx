import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';

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

  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    // Google API スクリプトを読み込む
    if (!window.gapi) {
      const script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.async = true;
      script1.defer = true;
      script1.onload = () => {
        setIsScriptLoaded(true);
        window.gapi.load('picker', () => {
          setIsPickerApiLoaded(true);
        });
      };
      document.body.appendChild(script1);
    } else {
      setIsScriptLoaded(true);
      window.gapi.load('picker', () => {
        setIsPickerApiLoaded(true);
      });
    }

    // Google Identity Services スクリプトを読み込む
    if (!window.google) {
      const script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.async = true;
      script2.defer = true;
      document.body.appendChild(script2);
    }
  }, []);

  const handleOpenPicker = () => {
    if (!isPickerApiLoaded || !window.google) {
      console.error('Google Picker API is not loaded yet');
      return;
    }

    // OAuth2トークンを取得
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (tokenResponse: any) => {
        createPicker(tokenResponse.access_token);
      },
    });

    tokenClient.requestAccessToken();
  };

  const createPicker = (accessToken: string) => {
    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.DOCS)
      .addView(new window.google.picker.DocsUploadView())
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setCallback(pickerCallback)
      .setTitle('Google Drive からファイルを選択')
      .setLocale('ja')
      .build();
    
    picker.setVisible(true);
  };

  const pickerCallback = (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const file = data.docs[0];
      
      // ファイル情報を親コンポーネントに渡す
      onFileSelect({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        url: file.url || `https://drive.google.com/file/d/${file.id}/view`,
        size: file.sizeBytes ? parseInt(file.sizeBytes) : undefined,
      });
    }
  };

  if (!apiKey || !clientId) {
    console.error('Google API credentials not configured');
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleOpenPicker}
      disabled={disabled || !isPickerApiLoaded}
    >
      <FolderOpen className="h-4 w-4 mr-2" />
      Google Drive から選択
    </Button>
  );
}