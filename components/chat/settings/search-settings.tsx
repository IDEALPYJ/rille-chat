"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Globe, 
  Loader2, 
  RefreshCcw, 
  Check,
  ChevronLeft
} from "lucide-react"
import { SettingsState, SearchConfig } from "./types"
import { useI18n } from "@/lib/i18n/context"
import { Button } from "@/components/ui/button"

interface SearchSettingsProps {
  settings: SettingsState
  onUpdateSearchConfig: (updates: Partial<SearchConfig>) => void
  saveStatus: "idle" | "saving" | "success" | "error"
  onSave: (state?: SettingsState) => void
  onBack?: () => void
}

export function SearchSettings({
  settings,
  onUpdateSearchConfig,
  saveStatus,
  onSave,
  onBack
}: SearchSettingsProps) {
  const { t } = useI18n()
  const handleUpdateProviderField = (provider: string, field: string, value: any, shouldSave = false) => {
    const newProviders = {
      ...settings.search.providers,
      [provider]: {
        ...settings.search.providers[provider],
        [field]: value
      }
    }
    onUpdateSearchConfig({ providers: newProviders })
    if (shouldSave) {
      onSave()
    }
  }

  return (
    <div className="w-full overflow-y-auto">
      <div className="w-full md:w-[70%] mx-auto px-4 md:px-0 py-0 md:py-8 space-y-6">
        <div className="h-14 border-b flex items-center gap-2 px-5 md:px-0 shrink-0 mb-6 md:mb-6">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-8 w-8 -ml-2 shrink-0"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="p-1.5 bg-muted dark:bg-muted rounded-lg shrink-0">
              <Globe className="h-5 w-5 text-foreground dark:text-foreground/70" />
            </div>
            <h2 className="text-xl font-bold">{t("search.title")}</h2>
          </div>
          <div className="flex items-center gap-4">
            {saveStatus === "saving" && (
              <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground text-xs animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("common.saving")}
              </div>
            )}
            {saveStatus === "error" && (
              <button
                onClick={() => onSave()}
                className="flex items-center gap-2 text-destructive text-xs hover:opacity-80 transition-opacity"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                {t("search.saveFailed")}
              </button>
            )}
            {saveStatus === "success" && (
              <div className="flex items-center gap-2 text-green-500 text-xs">
                <Check className="h-3.5 w-3.5" />
                {t("common.saved")}
              </div>
            )}
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <div className="flex items-center gap-3 hidden md:flex">
              <span className="text-xs text-muted-foreground dark:text-muted-foreground font-medium">
                {settings.search.enabled ? t("search.enabled") : t("search.disabled")}
              </span>
              <Switch
                checked={settings.search.enabled}
                onCheckedChange={(checked) => {
                  onUpdateSearchConfig({ enabled: checked })
                  onSave()
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{t("search.provider")}</Label>
            <Select
              value={settings.search.activeProvider}
              onValueChange={(val: string) => {
                onUpdateSearchConfig({ activeProvider: val })
                onSave()
              }}
            >
              <SelectTrigger className="h-8.5 text-xs">
                <SelectValue placeholder={t("search.selectProvider")} />
              </SelectTrigger>
              <SelectContent>
                {[
                  { id: "google", name: "Google" },
                  { id: "bing", name: "Bing" },
                  { id: "tavily", name: "Tavily" },
                  { id: "anspire", name: "Anspire" },
                  { id: "bocha", name: "Bocha" },
                  { id: "brave", name: "Brave" },
                  { id: "exa", name: "Exa" },
                  { id: "firecrawl", name: "Firecrawl" },
                  { id: "jina", name: "Jina" },
                  { id: "kagi", name: "Kagi" },
                  { id: "search1api", name: "Search1API" },
                  { id: "searxng", name: "SearXNG" },
                  { id: "perplexity", name: "Perplexity Search API" },
                  { id: "serpapi", name: "SerpAPI" },
                ].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true })).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* 动态配置界面 */}
          <div className="space-y-6">
            {settings.search.activeProvider === "google" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Google API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Google " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.google?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("google", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("search.searchEngineId")}</Label>
                  <Input
                    placeholder={t("search.searchEngineIdPlaceholder")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.google?.cx || ""}
                    onChange={(e) => handleUpdateProviderField("google", "cx", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.defaultNum")}</Label>
                    <Input
                      type="number"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.google?.defaultNum || 10}
                      onChange={(e) => handleUpdateProviderField("google", "defaultNum", parseInt(e.target.value))}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.safeSearch")}</Label>
                    <Select
                      value={settings.search.providers.google?.safeSearch || "off"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("google", "safeSearch", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "bing" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("search.subscriptionKey")}</Label>
                  <PasswordInput
                    placeholder={t("search.subscriptionKeyPlaceholder")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.bing?.subscriptionKey || ""}
                    onChange={(e) => handleUpdateProviderField("bing", "subscriptionKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("search.endpoint")}</Label>
                  <Input
                    placeholder="https://api.bing.microsoft.com/v7.0/search"
                    className="h-8.5 text-xs"
                    value={settings.search.providers.bing?.endpoint || ""}
                    onChange={(e) => handleUpdateProviderField("bing", "endpoint", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.market")}</Label>
                    <Input
                      placeholder="en-US"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.bing?.market || "en-US"}
                      onChange={(e) => handleUpdateProviderField("bing", "market", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.safeSearch")}</Label>
                    <Select
                      value={settings.search.providers.bing?.safeSearch || "Moderate"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("bing", "safeSearch", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Off">Off</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Strict">Strict</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "tavily" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tavily API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Tavily " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.tavily?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("tavily", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.searchDepth")}</Label>
                    <Select
                      value={settings.search.providers.tavily?.searchDepth || "basic"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("tavily", "searchDepth", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.maxResults")}</Label>
                    <Input
                      type="number"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.tavily?.maxResults || 5}
                      onChange={(e) => handleUpdateProviderField("tavily", "maxResults", parseInt(e.target.value))}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold">{t("search.includeAnswer")}</Label>
                  <Switch
                    checked={settings.search.providers.tavily?.includeAnswer || false}
                    onCheckedChange={(checked) => {
                      handleUpdateProviderField("tavily", "includeAnswer", checked, true)
                    }}
                  />
                </div>
              </div>
            )}

            {settings.search.activeProvider === "anspire" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Anspire API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Anspire " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.anspire?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("anspire", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Endpoint</Label>
                  <Input
                    placeholder="https://plugin.anspire.cn/api/ntsearch/search"
                    className="h-8.5 text-xs"
                    value={settings.search.providers.anspire?.endpoint || ""}
                    onChange={(e) => handleUpdateProviderField("anspire", "endpoint", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Top K</Label>
                  <Input
                    type="number"
                    className="h-8.5 text-xs"
                    value={settings.search.providers.anspire?.topK || 10}
                    onChange={(e) => handleUpdateProviderField("anspire", "topK", parseInt(e.target.value))}
                    onBlur={() => onSave()}
                  />
                </div>
              </div>
            )}

            {settings.search.activeProvider === "bocha" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Bocha API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Bocha " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.bocha?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("bocha", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.freshness")}</Label>
                    <Select
                      value={settings.search.providers.bocha?.freshness || "oneYear"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("bocha", "freshness", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="oneDay">One Day</SelectItem>
                        <SelectItem value="oneWeek">One Week</SelectItem>
                        <SelectItem value="oneMonth">One Month</SelectItem>
                        <SelectItem value="oneYear">One Year</SelectItem>
                        <SelectItem value="noLimit">No Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.count")}</Label>
                    <Input
                      type="number"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.bocha?.count || 8}
                      onChange={(e) => handleUpdateProviderField("bocha", "count", parseInt(e.target.value))}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold">{t("search.summary")}</Label>
                  <Switch
                    checked={settings.search.providers.bocha?.summary || false}
                    onCheckedChange={(checked) => {
                      handleUpdateProviderField("bocha", "summary", checked, true)
                    }}
                  />
                </div>
              </div>
            )}

            {settings.search.activeProvider === "brave" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Brave API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Brave " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.brave?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("brave", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.country")}</Label>
                    <Input
                      placeholder="us"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.brave?.country || "us"}
                      onChange={(e) => handleUpdateProviderField("brave", "country", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.searchType")}</Label>
                    <Select
                      value={settings.search.providers.brave?.searchType || "web"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("brave", "searchType", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="images">Images</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "exa" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Exa API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Exa " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.exa?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("exa", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.searchType")}</Label>
                    <Select
                      value={settings.search.providers.exa?.type || "neural"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("exa", "type", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="neural">Neural</SelectItem>
                        <SelectItem value="keyword">Keyword</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.resultCount")}</Label>
                    <Input
                      type="number"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.exa?.numResults || 10}
                      onChange={(e) => handleUpdateProviderField("exa", "numResults", parseInt(e.target.value))}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("search.category")}</Label>
                  <Input
                    placeholder="general"
                    className="h-8.5 text-xs"
                    value={settings.search.providers.exa?.category || ""}
                    onChange={(e) => handleUpdateProviderField("exa", "category", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
              </div>
            )}

            {settings.search.activeProvider === "firecrawl" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Firecrawl API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Firecrawl " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.firecrawl?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("firecrawl", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Endpoint</Label>
                  <Input
                    placeholder="https://api.firecrawl.dev/v1/scrape"
                    className="h-8.5 text-xs"
                    value={settings.search.providers.firecrawl?.endpoint || ""}
                    onChange={(e) => handleUpdateProviderField("firecrawl", "endpoint", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("search.mode")}</Label>
                  <Select
                    value={settings.search.providers.firecrawl?.mode || "scrape"}
                    onValueChange={(val) => {
                      handleUpdateProviderField("firecrawl", "mode", val, true)
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scrape">Scrape</SelectItem>
                      <SelectItem value="crawl">Crawl</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "jina" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("search.mode")}</Label>
                  <Select
                    value={settings.search.providers.jina?.mode || "free-endpoint"}
                    onValueChange={(val) => {
                      handleUpdateProviderField("jina", "mode", val, true)
                    }}
                  >
                    <SelectTrigger className="h-8.5 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free-endpoint">Free Endpoint</SelectItem>
                      <SelectItem value="official-api">Official API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {settings.search.providers.jina?.mode === "official-api" ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Jina API Key</Label>
                    <PasswordInput
                      placeholder={t("search.placeholder") + " Jina " + t("search.apiKey")}
                      className="h-8.5 text-xs"
                      value={settings.search.providers.jina?.apiKey || ""}
                      onChange={(e) => handleUpdateProviderField("jina", "apiKey", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Search Base URL</Label>
                      <Input
                        placeholder="https://s.jina.ai/"
                        className="h-8.5 text-xs"
                        value={settings.search.providers.jina?.searchBaseUrl || ""}
                        onChange={(e) => handleUpdateProviderField("jina", "searchBaseUrl", e.target.value)}
                        onBlur={() => onSave()}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Read Base URL</Label>
                      <Input
                        placeholder="https://r.jina.ai/"
                        className="h-8.5 text-xs"
                        value={settings.search.providers.jina?.readBaseUrl || ""}
                        onChange={(e) => handleUpdateProviderField("jina", "readBaseUrl", e.target.value)}
                        onBlur={() => onSave()}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {settings.search.activeProvider === "kagi" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Kagi API Token</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Kagi API Token"}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.kagi?.apiToken || ""}
                    onChange={(e) => handleUpdateProviderField("kagi", "apiToken", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.engine")}</Label>
                    <Input
                      placeholder="cecil"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.kagi?.engine || "cecil"}
                      onChange={(e) => handleUpdateProviderField("kagi", "engine", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.outputLanguage")}</Label>
                    <Input
                      placeholder="ZH"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.kagi?.language || "ZH"}
                      onChange={(e) => handleUpdateProviderField("kagi", "language", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.summaryType")}</Label>
                    <Select
                      value={settings.search.providers.kagi?.summaryType || "summary"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("kagi", "summaryType", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="takeaway">Takeaway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Label className="text-xs font-semibold">{t("search.enableCache")}</Label>
                    <Switch
                      checked={settings.search.providers.kagi?.cache !== false}
                      onCheckedChange={(checked) => {
                        handleUpdateProviderField("kagi", "cache", checked, true)
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "search1api" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Search1API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Search1API " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.search1api?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("search1api", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.searchService")}</Label>
                    <Select
                      value={settings.search.providers.search1api?.searchService || "google"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("search1api", "searchService", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="bing">Bing</SelectItem>
                        <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.timeRange")}</Label>
                    <Select
                      value={settings.search.providers.search1api?.timeRange || "year"}
                      onValueChange={(val) => {
                        handleUpdateProviderField("search1api", "timeRange", val, true)
                      }}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.maxResults")}</Label>
                    <Input
                      type="number"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.search1api?.maxResults || 5}
                      onChange={(e) => handleUpdateProviderField("search1api", "maxResults", parseInt(e.target.value))}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.deepSearch")}</Label>
                    <Input
                      type="number"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.search1api?.crawlResults || 0}
                      onChange={(e) => handleUpdateProviderField("search1api", "crawlResults", parseInt(e.target.value))}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.language")}</Label>
                    <Input
                      placeholder="en"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.search1api?.language || "en"}
                      onChange={(e) => handleUpdateProviderField("search1api", "language", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "searxng" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Instance URL</Label>
                  <Input
                    placeholder="https://searxng.example.com"
                    className="h-8.5 text-xs"
                    value={settings.search.providers.searxng?.instanceUrl || ""}
                    onChange={(e) => handleUpdateProviderField("searxng", "instanceUrl", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.category")}</Label>
                    <Input
                      placeholder="general"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.searxng?.categories || "general"}
                      onChange={(e) => handleUpdateProviderField("searxng", "categories", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.language")}</Label>
                    <Input
                      placeholder="zh-CN"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.searxng?.language || "zh-CN"}
                      onChange={(e) => handleUpdateProviderField("searxng", "language", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.engine")} (engines)</Label>
                    <Input
                      placeholder="google,bing"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.searxng?.engines || ""}
                      onChange={(e) => handleUpdateProviderField("searxng", "engines", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.outputFormat")}</Label>
                    <Input
                      placeholder="json"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.searxng?.outputFormat || "json"}
                      onChange={(e) => handleUpdateProviderField("searxng", "outputFormat", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "perplexity" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Perplexity API Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " Perplexity " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.perplexity?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("perplexity", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.maxResults")}</Label>
                    <Input
                      type="number"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.perplexity?.maxResults || 10}
                      onChange={(e) => handleUpdateProviderField("perplexity", "maxResults", parseInt(e.target.value))}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">国家 (country)</Label>
                    <Input
                      placeholder="us"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.perplexity?.country || "us"}
                      onChange={(e) => handleUpdateProviderField("perplexity", "country", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
              </div>
            )}

            {settings.search.activeProvider === "serpapi" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">SerpAPI Key</Label>
                  <PasswordInput
                    placeholder={t("search.placeholder") + " SerpAPI " + t("search.apiKey")}
                    className="h-8.5 text-xs"
                    value={settings.search.providers.serpapi?.apiKey || ""}
                    onChange={(e) => handleUpdateProviderField("serpapi", "apiKey", e.target.value)}
                    onBlur={() => onSave()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.engine")}</Label>
                    <Input
                      placeholder="google"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.serpapi?.engine || "google"}
                      onChange={(e) => handleUpdateProviderField("serpapi", "engine", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("search.location")}</Label>
                    <Input
                      placeholder="Austin, Texas"
                      className="h-8.5 text-xs"
                      value={settings.search.providers.serpapi?.location || ""}
                      onChange={(e) => handleUpdateProviderField("serpapi", "location", e.target.value)}
                      onBlur={() => onSave()}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs font-semibold">No Cache</Label>
                  <Switch
                    checked={settings.search.providers.serpapi?.noCache || false}
                    onCheckedChange={(checked) => {
                      handleUpdateProviderField("serpapi", "noCache", checked, true)
                    }}
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
