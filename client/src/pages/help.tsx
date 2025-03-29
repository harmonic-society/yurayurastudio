import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Home, ChevronsLeft } from "lucide-react";

export default function HelpPage() {
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // READMEファイルの内容を取得
  const { data: readmeData, isLoading, error } = useQuery<{ content: string }>({
    queryKey: ["/api/readme"],
  });

  // 目次を自動生成
  const [tableOfContents, setTableOfContents] = useState<{ id: string; title: string; level: number }[]>([]);

  // マークダウンからヘッダー情報を抽出して目次を構築
  useEffect(() => {
    if (readmeData?.content) {
      const lines = readmeData.content.split("\n");
      const headers: { id: string; title: string; level: number }[] = [];
      
      let headerId = 0;
      lines.forEach((line: string) => {
        // h1, h2, h3 ヘッダーを検出
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const title = match[2].trim();
          // ユニークなIDを生成するため、インデックスを追加
          const id = `heading-${headerId}-${title
            .toLowerCase()
            .replace(/[^\w\s-]/g, "") // 特殊文字を削除
            .replace(/\s+/g, "-")}`; // スペースをハイフンに変換
          
          headers.push({ id, title, level });
          headerId++;
        }
      });
      
      setTableOfContents(headers);
      
      // 最初のセクションをアクティブに設定
      if (headers.length > 0 && !activeSection) {
        setActiveSection(headers[0].id);
      }
    }
  }, [readmeData?.content, activeSection]);

  // 特定のセクションにスクロール
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // normalize text (子要素オブジェクトから実際のテキストを抽出)
  const normalizeHeadingText = (children: any): string => {
    // 文字列の場合はそのまま返す
    if (typeof children === 'string') return children;
    
    // 配列の場合は各要素に対して再帰的に処理
    if (Array.isArray(children)) {
      return children.map(normalizeHeadingText).join('');
    }
    
    // ReactElementの場合はpropsのchildrenを再帰的に処理
    if (children && typeof children === 'object') {
      if (children.props && children.props.children) {
        return normalizeHeadingText(children.props.children);
      }
      // その他の場合はchildrenがあれば処理
      if ('children' in children) {
        return normalizeHeadingText(children.children);
      }
    }
    
    // それ以外の場合は空文字列を返す
    return '';
  };

  // カスタムコンポーネント
  const components = {
    // ヘッダーコンポーネント
    h1: ({ children, ...props }: any) => {
      const text = normalizeHeadingText(children);
      // 対応する目次項目を探す
      const tocItem = tableOfContents.find(item => item.title === text && item.level === 1);
      const id = tocItem ? tocItem.id : `h1-${Math.random().toString(36).substring(2, 7)}`;
      
      // プライバシーポリシーと利用規約のセクションには特別なスタイルを適用
      const isSpecialSection = text === "プライバシーポリシー" || text === "サイト利用規約";
      
      return (
        <h1 
          id={id} 
          {...props} 
          className={`
            ${isSpecialSection ? 'mt-8 py-3 px-4 bg-primary/5 border-l-4 border-primary rounded-md' : ''}
          `}
        >
          {children}
        </h1>
      );
    },
    h2: ({ children, ...props }: any) => {
      const text = normalizeHeadingText(children);
      const tocItem = tableOfContents.find(item => item.title === text && item.level === 2);
      const id = tocItem ? tocItem.id : `h2-${Math.random().toString(36).substring(2, 7)}`;
      
      return (
        <h2 
          id={id} 
          {...props}
          className={`
            ${text.startsWith("1.") || text.startsWith("2.") || text.startsWith("3.") || 
              text.startsWith("4.") || text.startsWith("5.") || text.startsWith("6.") || 
              text.startsWith("7.") || text.startsWith("8.") || text.startsWith("9.") ? 
              'mt-6 pt-2 border-b border-primary/20' : ''}
          `}
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, ...props }: any) => {
      const text = normalizeHeadingText(children);
      const tocItem = tableOfContents.find(item => item.title === text && item.level === 3);
      const id = tocItem ? tocItem.id : `h3-${Math.random().toString(36).substring(2, 7)}`;
      
      return (
        <h3 
          id={id} 
          {...props}
          className={`
            ${text.includes("アカウント情報") || text.includes("利用情報") || text.includes("技術情報") ||
              text.includes("登録手続き") || text.includes("アカウント承認") || text.includes("知的財産権") ||
              text.includes("コンテンツの責任") || text.includes("サービスの変更") ? 
              'text-primary/90 font-medium' : ''}
          `}
        >
          {children}
        </h3>
      );
    },
    // リンクコンポーネント
    a: ({ node, href, children, ...props }: any) => {
      // 内部リンクか外部リンクかを判断
      const isInternalLink = href && href.startsWith('#');
      
      if (isInternalLink) {
        // #以降のIDを取得してスクロール
        const targetId = href.substring(1);
        return (
          <a 
            href={href} 
            onClick={(e) => {
              e.preventDefault();
              scrollToSection(targetId);
            }}
            {...props}
          >
            {children}
          </a>
        );
      }
      
      // 外部リンク
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      );
    },
    // テーブルコンポーネントの適切なスタイリング
    table: ({ children, ...props }: any) => {
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse" {...props}>
            {children}
          </table>
        </div>
      );
    },
    // コードブロックのスタイリング
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      return !inline ? (
        <div className="bg-muted p-4 rounded-md overflow-x-auto my-4">
          <pre className="whitespace-pre-wrap break-all">
            <code 
              className={match ? `language-${match[1]}` : ''} 
              {...props}
            >
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    // preタグのカスタマイズ
    pre: ({ children, ...props }: any) => {
      return (
        <pre className="bg-muted p-4 rounded-md overflow-x-auto my-4 whitespace-pre-wrap break-all" {...props}>
          {children}
        </pre>
      );
    },
    // リストアイテムのカスタマイズ
    li: ({ children, ...props }: any) => {
      const text = normalizeHeadingText(children);
      
      // プライバシーポリシーと利用規約のリストアイテムに特別なスタイルを適用
      // セクション内容を検出するための簡易的な方法
      const isPrivacyOrTerms = 
        text.includes("収集した情報") || 
        text.includes("法律に基づく") || 
        text.includes("当サービスの権利") ||
        text.includes("SSL/TLS") ||
        text.includes("アクセス制限") ||
        text.includes("法令または公序良俗") ||
        text.includes("犯罪行為") ||
        text.includes("知的財産権") ||
        text.includes("誹謗中傷") ||
        text.includes("本サービスの提供を中断");
      
      return (
        <li
          {...props}
          className={isPrivacyOrTerms ? "mb-2 py-1 border-b border-muted" : ""}
        >
          {children}
        </li>
      );
    },
    // 段落のカスタマイズ
    p: ({ children, ...props }: any) => {
      const text = normalizeHeadingText(children);
      
      // 重要な段落に特別なスタイルを適用
      const isImportantParagraph = 
        text.includes("当サービスでは、お客様の情報を保護するために") || 
        text.includes("ユーザーは、自身のアカウント情報") ||
        text.includes("当社は、本サービスに事実上または法律上の瑕疵") ||
        text.includes("このプライバシーポリシーは、必要に応じて更新");
      
      return (
        <p
          {...props}
          className={isImportantParagraph ? "bg-muted/50 p-2 rounded border-l-2 border-primary/50" : ""}
        >
          {children}
        </p>
      );
    }
  };

  // モバイルでメニューの表示/非表示を切り替え
  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  if (error) {
    toast({
      title: "エラー",
      description: "ヘルプ情報の読み込みに失敗しました",
      variant: "destructive",
    });
  }

  // レイアウトのヘッダーとサイドバーがネストする問題を解決するため、独自レイアウトを使用
  return (
    <div className="container mx-auto py-6 md:py-10 px-4">
      {/* ナビゲーションバー */}
      <div className="flex items-center mb-4 gap-4">
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>ダッシュボードに戻る</span>
          </Button>
        </Link>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
          Yura Yura STUDIO
        </h1>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">ヘルプセンター</CardTitle>
          <CardDescription>
            アプリケーションの使い方とよくある質問
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* モバイル用のメニュートグルボタン */}
            <div className="md:hidden flex justify-between items-center mb-4">
              <Button variant="outline" onClick={toggleMenu}>
                {showMenu ? "目次を隠す" : "目次を表示"}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // 前のセクションに移動
                    const currentIndex = tableOfContents.findIndex(item => item.id === activeSection);
                    if (currentIndex > 0) {
                      scrollToSection(tableOfContents[currentIndex - 1].id);
                    }
                  }}
                  disabled={tableOfContents.findIndex(item => item.id === activeSection) <= 0}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    // 次のセクションに移動
                    const currentIndex = tableOfContents.findIndex(item => item.id === activeSection);
                    if (currentIndex < tableOfContents.length - 1) {
                      scrollToSection(tableOfContents[currentIndex + 1].id);
                    }
                  }}
                  disabled={tableOfContents.findIndex(item => item.id === activeSection) >= tableOfContents.length - 1}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 目次（サイドバー） */}
            {(showMenu || !window.matchMedia("(max-width: 768px)").matches) && (
              <div className="md:w-1/4 md:min-w-[200px] md:max-w-[250px] md:sticky md:top-4 md:self-start">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">目次</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    {isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : (
                      <nav className="space-y-1">
                        {tableOfContents.map((item, index) => {
                          // タイトルにコードブロックなどが含まれている場合、それを文字列として処理
                          const cleanTitle = item.title.replace(/[<>]/g, '');
                          return (
                            <div
                              key={`toc-item-${index}`}
                              className={`
                                cursor-pointer py-1 px-2 rounded text-sm flex items-center
                                ${item.level === 1 ? "font-bold mt-2" : ""}
                                ${item.level === 2 ? "ml-2" : ""}
                                ${item.level === 3 ? "ml-4 text-xs" : ""}
                                ${activeSection === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}
                              `}
                              style={{ marginLeft: `${(item.level - 1) * 0.75}rem` }}
                              onClick={() => scrollToSection(item.id)}
                            >
                              {item.level === 1 && <div className="w-1 h-4 bg-primary/80 rounded-full mr-2"></div>}
                              {item.level === 2 && <div className="w-1 h-3 bg-primary/50 rounded-full mr-2"></div>}
                              {item.level === 3 && <div className="w-1 h-2 bg-primary/30 rounded-full mr-2"></div>}
                              <span className={`${item.title === "プライバシーポリシー" || item.title === "サイト利用規約" ? "text-primary font-medium" : ""}`}>
                                {cleanTitle}
                              </span>
                            </div>
                          );
                        })}
                      </nav>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* マークダウンコンテンツ */}
            <div className={`${showMenu ? "md:w-3/4" : "w-full"} prose prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert prose-headings:scroll-mt-20`}>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-8 w-2/3 mt-8" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="markdown-content markdown-custom">
                  {readmeData?.content ? (
                    <>
                      <div className="mb-8 p-4 bg-muted/30 rounded-lg">
                        <h2 className="text-lg font-medium mb-2">このヘルプページについて</h2>
                        <p>このページでは、Yura Yura STUDIOの使い方と開発者向け情報を提供しています。目次から必要な情報にジャンプできます。</p>
                      </div>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={components}
                      >
                        {readmeData.content}
                      </ReactMarkdown>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ChevronsLeft className="h-4 w-4" />
            <span>ページの先頭に戻る</span>
          </Button>
          <Link href="/">
            <Button variant="default" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>ダッシュボードに戻る</span>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}