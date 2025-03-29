import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Layout from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) {
      return children.map(normalizeHeadingText).join('');
    }
    if (children && children.props && children.props.children) {
      return normalizeHeadingText(children.props.children);
    }
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
      return <h1 id={id} {...props}>{children}</h1>;
    },
    h2: ({ children, ...props }: any) => {
      const text = normalizeHeadingText(children);
      const tocItem = tableOfContents.find(item => item.title === text && item.level === 2);
      const id = tocItem ? tocItem.id : `h2-${Math.random().toString(36).substring(2, 7)}`;
      return <h2 id={id} {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }: any) => {
      const text = normalizeHeadingText(children);
      const tocItem = tableOfContents.find(item => item.title === text && item.level === 3);
      const id = tocItem ? tocItem.id : `h3-${Math.random().toString(36).substring(2, 7)}`;
      return <h3 id={id} {...props}>{children}</h3>;
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
      return !inline ? (
        <div className="bg-muted p-4 rounded-md overflow-x-auto my-4">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      ) : (
        <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
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

  return (
    <Layout>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Yura Yura STUDIO ヘルプ</CardTitle>
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
                                cursor-pointer py-1 px-2 rounded text-sm
                                ${item.level === 1 ? "font-bold" : ""}
                                ${item.level === 2 ? "ml-2" : ""}
                                ${item.level === 3 ? "ml-4 text-xs" : ""}
                                ${activeSection === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}
                              `}
                              style={{ marginLeft: `${(item.level - 1) * 0.75}rem` }}
                              onClick={() => scrollToSection(item.id)}
                            >
                              {cleanTitle}
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
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={components}
                    >
                      {readmeData.content}
                    </ReactMarkdown>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}