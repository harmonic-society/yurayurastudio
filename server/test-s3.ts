import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

async function testS3Configuration() {
  console.log('🔍 S3設定のテストを開始します...\n');

  // 環境変数のチェック
  console.log('1️⃣ 環境変数のチェック:');
  const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET'];
  let allEnvVarsPresent = true;

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: 設定済み`);
      if (envVar === 'AWS_ACCESS_KEY_ID') {
        console.log(`   値: ${process.env[envVar]?.substring(0, 10)}...`);
      } else if (envVar !== 'AWS_SECRET_ACCESS_KEY') {
        console.log(`   値: ${process.env[envVar]}`);
      }
    } else {
      console.log(`❌ ${envVar}: 未設定`);
      allEnvVarsPresent = false;
    }
  }

  if (!allEnvVarsPresent) {
    console.log('\n❌ 必要な環境変数が設定されていません。');
    return;
  }

  // S3クライアントの作成
  const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  console.log('\n2️⃣ S3接続テスト:');
  
  try {
    // バケット一覧の取得（接続確認）
    const listCommand = new ListBucketsCommand({});
    const listResponse = await s3Client.send(listCommand);
    console.log('✅ AWS S3に接続成功');
    console.log(`   アカウントのバケット数: ${listResponse.Buckets?.length || 0}`);

    // 指定バケットの存在確認
    const targetBucket = process.env.AWS_S3_BUCKET!;
    const bucketExists = listResponse.Buckets?.some(bucket => bucket.Name === targetBucket);
    
    if (bucketExists) {
      console.log(`✅ バケット '${targetBucket}' が見つかりました`);
    } else {
      console.log(`⚠️  バケット '${targetBucket}' が見つかりません`);
      console.log('   利用可能なバケット:');
      listResponse.Buckets?.forEach(bucket => {
        console.log(`   - ${bucket.Name}`);
      });
    }

    // テストファイルのアップロード
    console.log('\n3️⃣ ファイルアップロードテスト:');
    const testFileName = `test/s3-test-${Date.now()}.txt`;
    const testContent = 'This is a test file for S3 configuration';

    const putCommand = new PutObjectCommand({
      Bucket: targetBucket,
      Key: testFileName,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain',
    });

    await s3Client.send(putCommand);
    console.log(`✅ テストファイルのアップロード成功: ${testFileName}`);

    // ファイルの取得テスト
    console.log('\n4️⃣ ファイル取得テスト:');
    const getCommand = new GetObjectCommand({
      Bucket: targetBucket,
      Key: testFileName,
    });

    const getResponse = await s3Client.send(getCommand);
    const bodyContents = await streamToString(getResponse.Body);
    
    if (bodyContents === testContent) {
      console.log('✅ ファイルの取得成功（内容も一致）');
    } else {
      console.log('⚠️  ファイルは取得できましたが、内容が一致しません');
    }

    // ファイルの削除テスト
    console.log('\n5️⃣ ファイル削除テスト:');
    const deleteCommand = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: testFileName,
    });

    await s3Client.send(deleteCommand);
    console.log('✅ テストファイルの削除成功');

    console.log('\n🎉 すべてのテストが成功しました！');
    console.log('S3の設定は正しく構成されています。');

  } catch (error: any) {
    console.log('\n❌ エラーが発生しました:');
    console.log(`   エラータイプ: ${error.name}`);
    console.log(`   メッセージ: ${error.message}`);
    
    // よくあるエラーの診断
    if (error.name === 'InvalidUserID.NotFound' || error.name === 'InvalidAccessKeyId') {
      console.log('\n💡 解決方法:');
      console.log('   - アクセスキーIDが正しいか確認してください');
      console.log('   - IAMユーザーが有効か確認してください');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('\n💡 解決方法:');
      console.log('   - シークレットアクセスキーが正しいか確認してください');
      console.log('   - 余分なスペースが含まれていないか確認してください');
    } else if (error.name === 'AccessDenied') {
      console.log('\n💡 解決方法:');
      console.log('   - IAMユーザーの権限を確認してください');
      console.log('   - バケットポリシーを確認してください');
    } else if (error.name === 'NoSuchBucket') {
      console.log('\n💡 解決方法:');
      console.log('   - バケット名が正しいか確認してください');
      console.log('   - リージョンが正しいか確認してください');
    }
  }
}

// ストリームを文字列に変換するヘルパー関数
async function streamToString(stream: any): Promise<string> {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

// テストを実行
testS3Configuration().catch(console.error);