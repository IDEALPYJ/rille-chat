import { SearchConfig, SearchProviderConfig, TavilyConfig, UserSettings } from "@/lib/types";
import { logger } from "@/lib/logger";

type SearchResult = { title: string; url: string; content: string };

// 支持的所有外部搜索服务商
const SUPPORTED_EXTERNAL_SEARCH_PROVIDERS = [
  "tavily", "bing", "google", "anspire", "bocha", "brave", 
  "exa", "firecrawl", "jina", "kagi", "search1api", 
  "searxng", "perplexity", "serpapi"
] as const;

type SupportedProvider = (typeof SUPPORTED_EXTERNAL_SEARCH_PROVIDERS)[number];

interface ActiveSearchProvider {
  id: SupportedProvider;
  config: SearchProviderConfig;
}

// API 响应类型定义
interface TavilyResponse {
  results?: Array<{
    title: string;
    url: string;
    content?: string;
    raw_content?: string;
  }>;
  answer?: string;
}

interface BingResponse {
  webPages?: {
    value?: Array<{
      name: string;
      url: string;
      snippet?: string;
      description?: string;
    }>;
  };
}

interface GoogleResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet?: string;
    htmlSnippet?: string;
  }>;
}

interface AnspireResponse {
  results?: Array<{
    title?: string;
    name?: string;
    url?: string;
    link?: string;
    content?: string;
    snippet?: string;
    description?: string;
  }>;
  data?: Array<{
    title?: string;
    name?: string;
    url?: string;
    link?: string;
    content?: string;
    snippet?: string;
    description?: string;
  }>;
}

interface BochaResponse {
  data?: {
    webPages?: {
      value?: Array<{
        name?: string;
        title?: string;
        url?: string;
        snippet?: string;
        summary?: string;
        content?: string;
      }>;
    };
  };
  results?: Array<{
    name?: string;
    title?: string;
    url?: string;
    snippet?: string;
    summary?: string;
    content?: string;
  }>;
  summary?: string;
}

interface BraveResponse {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      snippet?: string;
    }>;
  };
  results?: Array<{
    title?: string;
    url?: string;
    description?: string;
    snippet?: string;
  }>;
}

interface ExaResponse {
  results?: Array<{
    title?: string;
    url?: string;
    text?: string;
    snippet?: string;
  }>;
}

interface FirecrawlResponse {
  data?: Array<{
    title?: string;
    url?: string;
    markdown?: string;
    content?: string;
    description?: string;
    metadata?: {
      title?: string;
    };
  }>;
}

interface JinaResponse {
  data?: Array<{
    title?: string;
    url?: string;
    content?: string;
    description?: string;
  }>;
}

interface KagiResponse {
  data?: {
    output?: string;
    references?: Array<{
      title?: string;
      url?: string;
      snippet?: string;
    }>;
  };
  output?: string;
}

interface Search1apiResponse {
  results?: Array<{
    title?: string;
    link?: string;
    url?: string;
    snippet?: string;
    content?: string;
  }>;
}

interface SearxngResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    snippet?: string;
  }>;
}

interface PerplexityResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  citations?: string[];
}

interface SerpapiResponse {
  organic_results?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
  answer_box?: {
    answer?: string;
  };
}

function getActiveSearchProvider(settings: UserSettings): ActiveSearchProvider | null {
  if (!settings.search) {
    logger.debug("No search config in settings");
    return null;
  }

  // New config format
  if ("activeProvider" in settings.search && "providers" in settings.search) {
    const searchConfig = settings.search as SearchConfig;
    if (!searchConfig.enabled) {
      logger.debug("Search is disabled in settings");
      return null;
    }

    const activeProvider = searchConfig.activeProvider as SupportedProvider;
    if (!SUPPORTED_EXTERNAL_SEARCH_PROVIDERS.includes(activeProvider)) {
      logger.warn("Search provider not supported", { provider: activeProvider });
      return null;
    }

    const providerConfig = searchConfig.providers?.[activeProvider];
    if (!providerConfig) {
      logger.warn("Active search provider config missing", { provider: activeProvider });
      return null;
    }

    logger.debug("Using search provider", { provider: activeProvider });
    return { id: activeProvider, config: providerConfig };
  }

  // Legacy Tavily config
  const legacySearch = settings.search as { tavily?: TavilyConfig };
  if (legacySearch.tavily?.enabled && legacySearch.tavily.apiKey) {
    logger.debug("Using legacy Tavily config");
    return { id: "tavily", config: legacySearch.tavily as any };
  }

  logger.debug("No valid search provider configured");
  return null;
}

function buildSearchResponse(
  providerLabel: string,
  results: SearchResult[],
  answer?: string
) {
  const cappedResults = results.slice(0, 5);
  const searchResults = JSON.stringify({
    provider: providerLabel,
    answer,
    results: cappedResults,
  });

  const searchResultsContext = cappedResults
    .map(
      (r) =>
        `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`
    )
    .join("\n\n");

  const searchPrompt = `
Additional Context from Web Search (${providerLabel}):
${answer ? `Summary Answer: ${answer}\n` : ""}
Detailed Results:
${searchResultsContext}

Please use the above information to provide a more accurate and up-to-date response if relevant.
`;

  return { searchResults, searchPrompt };
}

// 创建带超时的 fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== Tavily ====================
async function searchWithTavily(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Tavily search requested but apiKey is missing");
    return null;
  }

  const endpoint = config.endpoint || "https://api.tavily.com/search";

  logger.debug("Calling Tavily API", { endpoint, query: query.slice(0, 50) });

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: config.apiKey,
        query,
        search_depth: config.searchDepth || "basic",
        include_answer: config.includeAnswer !== false,
        include_raw_content: config.extractDepth === "advanced",
        max_results: config.maxResults || 5,
      }),
    }, 15000); // 15秒超时

    if (!res.ok) {
      const errorText = await res.text();
      logger.warn("Tavily search failed", { status: res.status, error: errorText });
      return null;
    }

      const data = (await res.json()) as TavilyResponse;
      const results: SearchResult[] = (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content || r.raw_content || "",
      }));

      logger.info("Tavily search completed", { resultCount: results.length });
      return buildSearchResponse("Tavily", results, data.answer);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          logger.warn("Tavily search timeout - API did not respond in time");
        } else {
          logger.warn("Tavily search network error", { 
            error: err.message,
            hint: "Check if the API endpoint is accessible from your network. You may need to configure a proxy or use a different search provider."
          });
        }
      } else {
        logger.warn("Tavily search unknown error", { error: String(err) });
      }
    return null;
  }
}

// ==================== Bing ====================
async function searchWithBing(query: string, config: SearchProviderConfig) {
  if (!config?.subscriptionKey) {
    logger.warn("Bing search requested but subscriptionKey is missing");
    return null;
  }

  const endpoint = config.endpoint || "https://api.bing.microsoft.com/v7.0/search";
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(config.count || config.maxResults || 5));
  if (config.market) url.searchParams.set("mkt", config.market);
  if (config.safeSearch) url.searchParams.set("safeSearch", config.safeSearch);

  const res = await fetch(url.toString(), {
    headers: { "Ocp-Apim-Subscription-Key": config.subscriptionKey },
  });

  if (!res.ok) {
    logger.warn("Bing search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as BingResponse;
  const webResults = data.webPages?.value || [];
  const results: SearchResult[] = webResults.map((r) => ({
    title: r.name,
    url: r.url,
    content: r.snippet || r.description || "",
  }));

  if (results.length === 0) return null;
  logger.info("Bing search completed", { resultCount: results.length });
  return buildSearchResponse("Bing", results);
}

// ==================== Google ====================
async function searchWithGoogle(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey || !config?.cx) {
    logger.warn("Google CSE search requested but apiKey or cx is missing");
    return null;
  }

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", config.apiKey);
  url.searchParams.set("cx", config.cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", String(config.defaultNum || config.maxResults || 5));
  if (config.defaultLanguage) url.searchParams.set("lr", `lang_${config.defaultLanguage}`);
  if (config.defaultCountry) url.searchParams.set("gl", config.defaultCountry);
  if (config.safeSearch) url.searchParams.set("safe", config.safeSearch);

  const res = await fetch(url.toString());
  if (!res.ok) {
    logger.warn("Google search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as GoogleResponse;
  const results: SearchResult[] = (data.items || []).map((r) => ({
    title: r.title,
    url: r.link,
    content: r.snippet || r.htmlSnippet || "",
  }));

  if (results.length === 0) return null;
  logger.info("Google search completed", { resultCount: results.length });
  return buildSearchResponse("Google", results);
}

// ==================== Anspire ====================
async function searchWithAnspire(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Anspire search requested but apiKey is missing");
    return null;
  }

  const endpoint = config.endpoint || "https://plugin.anspire.cn/api/ntsearch/search";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      query,
      topK: config.topK || 10,
    }),
  });

  if (!res.ok) {
    logger.warn("Anspire search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as AnspireResponse;
  const results: SearchResult[] = (data.results || data.data || []).map((r) => ({
    title: r.title || r.name || "",
    url: r.url || r.link || "",
    content: r.content || r.snippet || r.description || "",
  }));

  if (results.length === 0) return null;
  logger.info("Anspire search completed", { resultCount: results.length });
  return buildSearchResponse("Anspire", results);
}

// ==================== Bocha ====================
async function searchWithBocha(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Bocha search requested but apiKey is missing");
    return null;
  }

  const endpoint = config.endpoint || "https://api.bochaai.com/v1/web-search";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      query,
      freshness: config.freshness || "oneYear",
      count: config.count || 8,
      summary: config.summary || false,
    }),
  });

  if (!res.ok) {
    logger.warn("Bocha search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as BochaResponse;
  const webResults = data.data?.webPages?.value || data.results || [];
  const results: SearchResult[] = webResults.map((r) => ({
    title: r.name || r.title || "",
    url: r.url || "",
    content: r.snippet || r.summary || r.content || "",
  }));

  if (results.length === 0) return null;
  logger.info("Bocha search completed", { resultCount: results.length });
  return buildSearchResponse("Bocha", results, data.summary);
}

// ==================== Brave ====================
async function searchWithBrave(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Brave search requested but apiKey is missing");
    return null;
  }

  const endpoint = config.endpoint || "https://api.search.brave.com/res/v1/web/search";
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  if (config.country) url.searchParams.set("country", config.country);
  if (config.searchType === "news") {
    url.pathname = url.pathname.replace("/web/", "/news/");
  }

  const res = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "X-Subscription-Token": config.apiKey,
    },
  });

  if (!res.ok) {
    logger.warn("Brave search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as BraveResponse;
  const webResults = data.web?.results || data.results || [];
  const results: SearchResult[] = webResults.map((r) => ({
    title: r.title || "",
    url: r.url || "",
    content: r.description || r.snippet || "",
  }));

  if (results.length === 0) return null;
  logger.info("Brave search completed", { resultCount: results.length });
  return buildSearchResponse("Brave", results);
}

// ==================== Exa ====================
async function searchWithExa(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Exa search requested but apiKey is missing");
    return null;
  }

  const endpoint = config.endpoint || "https://api.exa.ai";
  const searchUrl = `${endpoint.replace(/\/$/, "")}/search`;

  const res = await fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    },
    body: JSON.stringify({
      query,
      type: config.type || "neural",
      category: config.category || "general",
      numResults: config.numResults || 10,
      contents: {
        text: true,
      },
    }),
  });

  if (!res.ok) {
    logger.warn("Exa search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as ExaResponse;
  const results: SearchResult[] = (data.results || []).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    content: r.text || r.snippet || "",
  }));

  if (results.length === 0) return null;
  logger.info("Exa search completed", { resultCount: results.length });
  return buildSearchResponse("Exa", results);
}

// ==================== Firecrawl ====================
async function searchWithFirecrawl(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Firecrawl search requested but apiKey is missing");
    return null;
  }

  const endpoint = config.endpoint || "https://api.firecrawl.dev/v1/search";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      query,
      limit: config.maxResults || 5,
    }),
  });

  if (!res.ok) {
    logger.warn("Firecrawl search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as FirecrawlResponse;
  const results: SearchResult[] = (data.data || []).map((r) => ({
    title: r.title || r.metadata?.title || "",
    url: r.url || "",
    content: r.markdown || r.content || r.description || "",
  }));

  if (results.length === 0) return null;
  logger.info("Firecrawl search completed", { resultCount: results.length });
  return buildSearchResponse("Firecrawl", results);
}

// ==================== Jina ====================
async function searchWithJina(query: string, config: SearchProviderConfig) {
  // Jina 支持两种模式：free-endpoint 和 official-api
  const isFreeMode = config.mode !== "official-api";

  if (!isFreeMode && !config?.apiKey) {
    logger.warn("Jina search requested with official-api mode but apiKey is missing");
    return null;
  }

  const searchBaseUrl = config.searchBaseUrl || "https://s.jina.ai/";
  const searchUrl = `${searchBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(query)}`;

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const res = await fetch(searchUrl, { headers });

  if (!res.ok) {
    logger.warn("Jina search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as JinaResponse;
  const results: SearchResult[] = (data.data || []).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    content: r.content || r.description || "",
  }));

  if (results.length === 0) return null;
  logger.info("Jina search completed", { resultCount: results.length });
  return buildSearchResponse("Jina", results);
}

// ==================== Kagi ====================
async function searchWithKagi(query: string, config: SearchProviderConfig) {
  if (!config?.apiToken) {
    logger.warn("Kagi search requested but apiToken is missing");
    return null;
  }

  // Kagi 使用 summarizer API
  const endpoint = "https://kagi.com/api/v0/summarize";
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("engine", config.engine || "cecil");
  url.searchParams.set("summary_type", config.summaryType || "summary");
  if (config.language) url.searchParams.set("target_language", config.language);
  if (config.cache === false) url.searchParams.set("cache", "false");

  const res = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bot ${config.apiToken}`,
    },
  });

  if (!res.ok) {
    logger.warn("Kagi search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as KagiResponse;
  // Kagi 返回的是摘要而非搜索结果列表
  const summary = data.data?.output || data.output || "";
  const results: SearchResult[] = data.data?.references?.map((r) => ({
    title: r.title || "",
    url: r.url || "",
    content: r.snippet || "",
  })) || [];

  logger.info("Kagi search completed", { resultCount: results.length });
  return buildSearchResponse("Kagi", results, summary);
}

// ==================== Search1API ====================
async function searchWithSearch1api(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Search1API search requested but apiKey is missing");
    return null;
  }

  const endpoint = "https://api.search1api.com/search";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_service: config.searchService || "google",
      max_results: config.maxResults || 5,
      crawl_results: config.crawlResults || 0,
      language: config.language || "en",
      time_range: config.timeRange || "year",
    }),
  });

  if (!res.ok) {
    logger.warn("Search1API search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as Search1apiResponse;
  const results: SearchResult[] = (data.results || []).map((r) => ({
    title: r.title || "",
    url: r.link || r.url || "",
    content: r.snippet || r.content || "",
  }));

  if (results.length === 0) return null;
  logger.info("Search1API search completed", { resultCount: results.length });
  return buildSearchResponse("Search1API", results);
}

// ==================== SearXNG ====================
async function searchWithSearxng(query: string, config: SearchProviderConfig) {
  if (!config?.instanceUrl) {
    logger.warn("SearXNG search requested but instanceUrl is missing");
    return null;
  }

  const baseUrl = config.instanceUrl.replace(/\/$/, "");
  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", config.outputFormat || "json");
  if (config.categories) url.searchParams.set("categories", config.categories);
  if (config.engines) url.searchParams.set("engines", config.engines);
  if (config.language) url.searchParams.set("language", config.language);
  if (config.timeRange) url.searchParams.set("time_range", config.timeRange);

  const res = await fetch(url.toString());

  if (!res.ok) {
    logger.warn("SearXNG search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as SearxngResponse;
  const results: SearchResult[] = (data.results || []).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    content: r.content || r.snippet || "",
  }));

  if (results.length === 0) return null;
  logger.info("SearXNG search completed", { resultCount: results.length });
  return buildSearchResponse("SearXNG", results);
}

// ==================== Perplexity ====================
async function searchWithPerplexity(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("Perplexity search requested but apiKey is missing");
    return null;
  }

  // Perplexity 使用 chat completions API 来搜索
  const endpoint = "https://api.perplexity.ai/chat/completions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        {
          role: "user",
          content: query,
        },
      ],
      max_tokens: 1024,
      return_citations: true,
    }),
  });

  if (!res.ok) {
    logger.warn("Perplexity search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as PerplexityResponse;
  const answer = data.choices?.[0]?.message?.content || "";
  const citations = data.citations || [];
  
  const results: SearchResult[] = citations.map((url, idx) => ({
    title: `Source ${idx + 1}`,
    url,
    content: "",
  }));

  logger.info("Perplexity search completed", { citationCount: citations.length });
  return buildSearchResponse("Perplexity", results, answer);
}

// ==================== SerpAPI ====================
async function searchWithSerpapi(query: string, config: SearchProviderConfig) {
  if (!config?.apiKey) {
    logger.warn("SerpAPI search requested but apiKey is missing");
    return null;
  }

  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("api_key", config.apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("engine", config.engine || "google");
  if (config.location) url.searchParams.set("location", config.location);
  if (config.noCache) url.searchParams.set("no_cache", "true");

  const res = await fetch(url.toString());

  if (!res.ok) {
    logger.warn("SerpAPI search failed", { status: res.status });
    return null;
  }

  const data = (await res.json()) as SerpapiResponse;
  const organicResults = data.organic_results || [];
  const results: SearchResult[] = organicResults.map((r) => ({
    title: r.title || "",
    url: r.link || "",
    content: r.snippet || "",
  }));

  if (results.length === 0) return null;
  logger.info("SerpAPI search completed", { resultCount: results.length });
  return buildSearchResponse("SerpAPI", results, data.answer_box?.answer);
}

// ==================== 主搜索函数 ====================
export async function performWebSearch(query: string, settings: UserSettings) {
  const provider = getActiveSearchProvider(settings);
  if (!provider) {
    logger.debug("No active search provider, skipping web search");
    return null;
  }

  logger.info("Performing web search", { provider: provider.id, queryLength: query.length });

  try {
    switch (provider.id) {
      case "tavily":
        return await searchWithTavily(query, provider.config);
      case "bing":
        return await searchWithBing(query, provider.config);
      case "google":
        return await searchWithGoogle(query, provider.config);
      case "anspire":
        return await searchWithAnspire(query, provider.config);
      case "bocha":
        return await searchWithBocha(query, provider.config);
      case "brave":
        return await searchWithBrave(query, provider.config);
      case "exa":
        return await searchWithExa(query, provider.config);
      case "firecrawl":
        return await searchWithFirecrawl(query, provider.config);
      case "jina":
        return await searchWithJina(query, provider.config);
      case "kagi":
        return await searchWithKagi(query, provider.config);
      case "search1api":
        return await searchWithSearch1api(query, provider.config);
      case "searxng":
        return await searchWithSearxng(query, provider.config);
      case "perplexity":
        return await searchWithPerplexity(query, provider.config);
      case "serpapi":
        return await searchWithSerpapi(query, provider.config);
      default:
        logger.warn("Web search provider not implemented", { provider: provider.id });
        return null;
    }
  } catch (err) {
    logger.error("Web search failed", err);
    return null;
  }
}
