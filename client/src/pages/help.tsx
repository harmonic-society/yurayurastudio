import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

      lines.forEach((line: string) => {
        // h1, h2, h3 ヘッダーを検出
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
          const level = match[1].length;
          const title = match[2].trim();
          const id = title
            .toLowerCase()
            .replace(/[^\w\s-]/g, "") // 特殊文字を削除
            .replace(/\s+/g, "-"); // スペースをハイフンに変換
          
          headers.push({ id, title, level });
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

  // マークダウン内のヘッダーにIDを追加するためのカスタムレンダラー
  const customRenderers: any = {
    h1: ({ children }: any) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      return <h1 id={id} className="text-3xl font-bold mt-8 mb-4">{children}</h1>;
    },
    h2: ({ children }: any) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      return <h2 id={id} className="text-2xl font-bold mt-6 mb-3">{children}</h2>;
    },
    h3: ({ children }: any) => {
      const id = String(children)
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      return <h3 id={id} className="text-xl font-semibold mt-4 mb-2">{children}</h3>;
    },
    // リストアイテムのスタイリング
    li: ({ children }: any) => {
      return <li className="mb-1">{children}</li>;
    },
    // コードブロックのスタイリング
    code: ({ node, inline, className, children, ...props }: any) => {
      return (
        <code
          className={`${className} ${
            inline ? "bg-muted px-1 py-0.5 rounded" : "block bg-muted p-4 rounded-md overflow-x-auto"
          }`}
          {...props}
        >
          {children}
        </code>
      );
    },
    // その他のマークダウン要素のスタイリング
    p: ({ children }: any) => {
      return <p className="mb-4">{children}</p>;
    },
    a: ({ href, children }: any) => {
      return (
        <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
    table: ({ children }: any) => {
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse border border-border">{children}</table>
        </div>
      );
    },
    th: ({ children }: any) => {
      return <th className="border border-border p-2 bg-muted">{children}</th>;
    },
    td: ({ children }: any) => {
      return <td className="border border-border p-2">{children}</td>;
    },
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
                        {tableOfContents.map(item => (
                          <div
                            key={item.id}
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
                            {item.title}
                          </div>
                        ))}
                      </nav>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* マークダウンコンテンツ */}
            <div className={`${showMenu ? "md:w-3/4" : "w-full"} prose prose-sm md:prose-base lg:prose-lg max-w-none dark:prose-invert`}>
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
                <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={customRenderers}
                  >
                    {readmeData?.content || ""}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}