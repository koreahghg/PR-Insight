import OpenAI from 'openai'

// Lazy singleton — import 시점이 아닌 첫 호출 시 API 키를 검증하여
// 환경변수 미설정 시 서버 전체가 크래시되는 것을 방지
let _client: OpenAI | null = null

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
    _client = new OpenAI({ apiKey })
  }
  return _client
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// gpt-4o-mini: 비용 효율적, 빠름 — 요약/분류 작업에 충분한 성능
// gpt-4o: 복잡한 코드 이해가 필요할 때 업그레이드 옵션
const DEFAULT_MODEL = 'gpt-4o-mini'

export async function chatCompletion(
  messages: ChatMessage[],
  options: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const { model = DEFAULT_MODEL, maxTokens = 512 } = options

  const response = await getClient().chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    // temperature 0.2 — 창의적 표현보다 사실 기반의 일관된 요약을 위해 낮게 설정
    temperature: 0.2,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Empty response from OpenAI')
  return content.trim()
}

// LLM 응답이 ```json ... ``` 코드블록으로 감싸인 경우에도 안전하게 파싱
export function parseAIJson<T>(raw: string, fallback: T, tag: string): T {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    return JSON.parse(jsonMatch ? jsonMatch[0] : raw) as T
  } catch {
    console.warn(`[${tag}] JSON parse failed, using fallback.\nRaw:`, raw)
    return fallback
  }
}
