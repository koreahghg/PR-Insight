import { chatCompletion, parseAIJson } from './openaiClient'
import { RefactorResult } from './types'

const REFACTOR_SYSTEM = `You are a senior software engineer specializing in code quality and refactoring.
Analyze the provided code and suggest concrete, impactful refactoring improvements.

For each suggestion provide:
- "title": short descriptive name of the improvement (Korean)
- "originalCode": the specific problematic code snippet extracted from the user's code
- "improvedCode": the refactored version of that exact snippet
- "explanation": explain WHY this is better — cite specific benefits, principles, or risks avoided (Korean)
- "category": one of "readability" | "performance" | "maintainability" | "security"
- "impact": "high" | "medium" | "low" — based on degree of code quality improvement

Rules:
- originalCode and improvedCode must be real extracts/rewrites from the provided code, not generic placeholders
- Keep each snippet focused on the specific change (not the entire file)
- Aim for 2–5 impactful suggestions; omit categories with nothing meaningful to improve
- All text fields (title, explanation, overallSummary) must be in Korean
- "overallSummary": 2–3 sentences summarizing overall code quality and key improvement areas (Korean)

Respond ONLY with valid JSON (no markdown fences):
{
  "suggestions": [
    {
      "title": "string",
      "originalCode": "string",
      "improvedCode": "string",
      "explanation": "string",
      "category": "readability|performance|maintainability|security",
      "impact": "high|medium|low"
    }
  ],
  "overallSummary": "string"
}`

const EMPTY_RESULT: RefactorResult = {
  suggestions: [],
  overallSummary: '분석 결과를 가져오는 데 실패했습니다.',
}

export async function generateRefactorSuggestions(
  code: string,
  language?: string,
  context?: string
): Promise<RefactorResult> {
  const langLine = language ? `Language: ${language}\n` : ''
  const contextLine = context ? `Context: ${context}\n` : ''
  const userContent = `${langLine}${contextLine}\n\`\`\`\n${code}\n\`\`\``

  const response = await chatCompletion(
    [
      { role: 'system', content: REFACTOR_SYSTEM },
      { role: 'user', content: userContent },
    ],
    { maxTokens: 1500 }
  )

  return parseAIJson(response, EMPTY_RESULT, 'CodeRefactorer')
}
