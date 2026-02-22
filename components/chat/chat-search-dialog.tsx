"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Search, Loader2, MessageSquare, ChevronUp, ChevronDown } from "lucide-react"
import { useDebounce } from "react-use"
import Highlighter from "react-highlight-words"
import { MessageRow } from "./message-row"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { Message } from "@/lib/types"
import { useI18n } from "@/lib/i18n/context"

interface SearchResult {
  id: string
  title: string
  messages: Message[]
}

interface ChatSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatSearchDialog({ open, onOpenChange }: ChatSearchDialogProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [activeMessageIndex, setActiveMessageIndex] = useState(0)

  useDebounce(() => setDebouncedQuery(searchQuery), 300, [searchQuery])

  useEffect(() => {
    if (!open) {
      // 重置状态
      setSearchQuery("")
      setDebouncedQuery("")
      setResults([])
      setSelectedResult(null)
      setActiveMessageIndex(0)
    } else {
      // 当弹窗打开时，聚焦到搜索框
      setTimeout(() => {
        document.getElementById("chat-search-input")?.focus()
      }, 100)
    }
  }, [open])

  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setResults([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/chat/search?query=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error(t("searchDialog.searchFailed"))
      }
      const data = await response.json()
      setResults(data)
    } catch (err: any) {
      setError(err.message || t("searchDialog.unknownError"))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  useEffect(() => {
    // 当选中的结果变化时，重置消息索引
    setActiveMessageIndex(0)
  }, [selectedResult])

  const handleResultClick = (result: SearchResult, messageIndex: number) => {
    const message = result.messages[messageIndex]
    if (message) {
      // 假设跳转逻辑是 /chat?id=sessionId#message-messageId
      router.push(`/chat?id=${result.id}#message-${message.id}`)
      onOpenChange(false)
    }
  }

  const highlightProps = {
    highlightClassName: "bg-blue-200/80 dark:bg-blue-500/80 px-1 py-0.5 rounded-md",
    searchWords: debouncedQuery.split(/\s+/).filter(Boolean),
    autoEscape: true,
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="!w-[80vw] !max-w-[80vw] h-[80vh] flex flex-col p-0 gap-0 !rounded-lg overflow-hidden bg-background origin-left data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300 [&>button]:hidden"
          overlayClassName="bg-background/60 backdrop-blur-sm"
        >
          {/* Visually hidden title for accessibility */}
          <DialogTitle className="sr-only">{t("searchDialog.title")}</DialogTitle>
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-full md:w-[40%] h-full flex flex-col md:border-r">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    id="chat-search-input"
                    placeholder={t("searchDialog.placeholder")}
                    className="pl-8 h-7 min-h-[28px] text-xs rounded-md bg-background border-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("searchDialog.searching")}
                </div>
              ) : error ? (
                <div className="p-6 text-sm text-red-500">{error}</div>
              ) : !debouncedQuery ? (
                <div className="text-center text-sm text-muted-foreground p-10">
                  {t("searchDialog.enterKeywords")}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground p-10">
                  {t("searchDialog.noResults", { query: debouncedQuery })}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className={`p-3 rounded-md hover:bg-muted/80 cursor-pointer ${selectedResult?.id === result.id ? 'bg-muted/80' : ''}`}
                      onMouseEnter={() => setSelectedResult(result)}
                      onClick={() => handleResultClick(result, activeMessageIndex)}
                    >
                      <div className="font-semibold text-sm truncate">
                        <Highlighter {...highlightProps} textToHighlight={result.title} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.messages.length > 0
                          ? t("searchDialog.matchedMessages", { count: result.messages.length })
                          : t("searchDialog.titleMatch")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="hidden md:flex w-[60%] h-full flex-col bg-muted/20 relative">
            {selectedResult ? (
              <>
                <div className="p-4 border-b flex items-center justify-between bg-background/50">
                  <h3 className="font-semibold text-base truncate">{selectedResult.title}</h3>
                </div>
                <div className="flex-1 overflow-y-auto relative">
                  {selectedResult.messages.length > 0 ? (
                    <div className="divide-y divide-border">
                    {selectedResult.messages.map((msg, index) => (
                      <div
                        key={msg.id}
                        className={`cursor-pointer ${index === activeMessageIndex ? 'bg-background/80' : 'opacity-60 hover:opacity-100'}`}
                        id={`search-message-${msg.id}`}
                        onClick={() => handleResultClick(selectedResult, index)}
                      >
                        <MessageRow
                          message={msg}
                          messageMap={new Map()}
                          rootMessageIds={[]}
                          setCurrentLeafId={() => {}}
                          _onEdit={() => {}}
                          onRegenerate={() => {}}
                          _onSelectArtifact={() => {}}
                          isEditing={false}
                          editContent=""
                          onEditStart={() => {}}
                          onEditCancel={() => {}}
                          onEditSave={() => {}}
                          onEditContentChange={() => {}}
                          isLast={index === selectedResult.messages.length - 1}
                          isLoading={false}
                          searchWords={highlightProps.searchWords}
                          highlightClassName={highlightProps.highlightClassName}
                        />
                      </div>
                    ))}
                    </div>
                  ) : (
                     <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground p-10">
                       <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                       {t("searchDialog.titleOnlyMatch")}
                    </div>
                  )}
                  
                  {selectedResult.messages.length > 1 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 bg-background/80 border rounded-full p-1 shadow-md">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMessageIndex(prev => Math.max(0, prev - 1)); }}
                        disabled={activeMessageIndex === 0}
                        className="p-1.5 rounded-full hover:bg-muted disabled:opacity-50"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-mono select-none">
                        {activeMessageIndex + 1}/{selectedResult.messages.length}
                      </span>
                       <button
                        onClick={(e) => { e.stopPropagation(); setActiveMessageIndex(prev => Math.min(selectedResult.messages.length - 1, prev + 1)); }}
                        disabled={activeMessageIndex === selectedResult.messages.length - 1}
                        className="p-1.5 rounded-full hover:bg-muted disabled:opacity-50"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground">
                {t("searchDialog.hoverHint")}
              </div>
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}