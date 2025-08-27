-- Google Drive機能のためのカラムを追加
ALTER TABLE project_files 
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'upload',
ADD COLUMN IF NOT EXISTS google_drive_id TEXT,
ADD COLUMN IF NOT EXISTS google_drive_url TEXT;