/**
 * 联网搜索服务 — 纯 Web 版本。
 *
 * 策略：
 *   1. 通过 CORS 代理访问 Bing 搜索页面，解析 HTML 提取结果
 *   2. 并行调用 DuckDuckGo Instant Answer API 作为兜底
 *   3. 所有路径都失败时返回空字符串，不阻塞主对话流程
 *
 * 注意：CORS 代理在国内网络下可能不稳定。若搜索失败，LLM 将回退到训练数据。
 */

interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
}

const FETCH_TIMEOUT = 8000;

async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
  } finally {
    clearTimeout(timer);
  }
}

// 多个 CORS 代理备选，提高可用性
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

async function fetchViaProxy(targetUrl: string): Promise<string | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetchWithTimeout(proxy(targetUrl));
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) return text;
      }
    } catch (err) {
      console.warn('Proxy failed, trying next:', err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/**
 * 从 Bing 搜索结果 HTML 中提取搜索结果。
 */
function parseBingHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const items = doc.querySelectorAll('.b_algo');
    items.forEach((item, i) => {
      if (i >= 5) return;
      const titleEl = item.querySelector('h2 a');
      const snippetEl = item.querySelector('.b_caption p') || item.querySelector('p');
      const title = titleEl?.textContent?.trim() || '';
      const href = titleEl?.getAttribute('href') || '';
      const snippet = snippetEl?.textContent?.trim() || '';
      if (title && snippet) {
        results.push({ title, snippet: snippet.slice(0, 300), url: href });
      }
    });

    if (results.length === 0) {
      const links = doc.querySelectorAll('li.b_algo h2 a, .b_title a, h2 a');
      links.forEach((link, i) => {
        if (i >= 5) return;
        const title = link.textContent?.trim() || '';
        const href = link.getAttribute('href') || '';
        const parent = link.closest('li') || link.parentElement?.parentElement;
        const snippet = parent?.querySelector('p, .b_caption p')?.textContent?.trim() || '';
        if (title) {
          results.push({ title, snippet: snippet.slice(0, 300), url: href });
        }
      });
    }
  } catch (err) {
    console.warn('Failed to parse Bing HTML:', err);
  }
  return results;
}

async function searchBingViaProxy(query: string): Promise<SearchResult[]> {
  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=8&setlang=zh-CN`;
  const html = await fetchViaProxy(bingUrl);
  if (!html) return [];
  return parseBingHtml(html);
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];
    const data: any = await res.json();
    const results: SearchResult[] = [];
    if (data && data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL,
      });
    }
    if (data && Array.isArray(data.RelatedTopics)) {
      for (const t of data.RelatedTopics.slice(0, 3)) {
        if (t && t.Text) {
          results.push({ title: t.Text.split(' - ')[0] || '', snippet: t.Text, url: t.FirstURL });
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * 主入口：对用户查询执行联网搜索，返回格式化的上下文文本。
 */
export async function searchWeb(query: string): Promise<string> {
  if (!query || query.trim().length < 2) return '';

  const trimmed = query.trim();
  console.log('[WebSearch] searching for:', trimmed);

  try {
    const [bingResults, ddgResults] = await Promise.allSettled([
      searchBingViaProxy(trimmed),
      searchDuckDuckGo(trimmed),
    ]);

    const bing = bingResults.status === 'fulfilled' ? bingResults.value : [];
    const ddg = ddgResults.status === 'fulfilled' ? ddgResults.value : [];

    console.log(`[WebSearch] Bing: ${bing.length}, DuckDuckGo: ${ddg.length}`);

    const seen = new Set<string>();
    const all: SearchResult[] = [];
    for (const r of [...bing, ...ddg]) {
      const key = r.title.toLowerCase().slice(0, 50);
      if (!seen.has(key) && r.snippet) {
        seen.add(key);
        all.push(r);
      }
    }

    if (all.length === 0) {
      console.warn('[WebSearch] No results from any source');
      return '';
    }

    const lines = all.slice(0, 5).map((r, i) => {
      const parts = [`【${i + 1}】${r.title}`];
      if (r.snippet) parts.push(r.snippet.slice(0, 400));
      if (r.url) parts.push(`来源: ${r.url}`);
      return parts.join('\n');
    });

    return lines.join('\n\n');
  } catch (err) {
    console.warn('[WebSearch] failed (non-fatal):', err);
    return '';
  }
}

/**
 * 构建注入到 system prompt 的联网搜索上下文。
 */
export function buildWebSearchContext(searchResults: string): string {
  if (!searchResults) return '';
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return [
    '===== 联网搜索结果（最新网络信息，请务必优先参考这些信息回答用户问题）=====',
    `搜索时间：${dateStr}（当前真实日期）`,
    '',
    searchResults,
    '',
    '===== 搜索结果结束 =====',
    '',
    '重要指令：',
    '1. 以上是刚刚从互联网搜索到的最新信息，包含当前日期的真实数据',
    '2. 回答用户问题时，必须优先引用以上搜索结果中的信息',
    `3. 当前真实日期是 ${dateStr}。如果你的训练数据早于这个日期，对于任何时效性问题（新闻、价格、版本、最新事件等），必须以搜索结果为准`,
    '4. 不要声称"知识截止"或"无法获取最新信息"——搜索结果就是最新信息',
    '5. 如果搜索结果与你的训练知识冲突，以搜索结果为准',
    '6. 在回答中明确引用搜索结果中的具体数字、日期、事件，让用户感受到你真的"联网"了',
  ].join('\n');
}
