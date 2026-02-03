/**
 * Claude AI Adapter (Phase 2+)
 *
 * 실제 Claude API 연동
 * 환경변수: VITE_ANTHROPIC_API_KEY
 */

import { DreamAnalysisSchema, ForecastSchema } from '../../ai/schemas';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Claude API 호출
 */
async function callClaude(systemPrompt, userMessage, maxTokens = 1024) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * JSON 파싱 with 재시도
 */
function parseJSON(text, retryCount = 0) {
  try {
    // JSON 블록 추출
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (error) {
    if (retryCount < 1) {
      // 간단한 정리 후 재시도
      const cleaned = text.replace(/[\x00-\x1F]+/g, ' ');
      return parseJSON(cleaned, retryCount + 1);
    }
    throw error;
  }
}

/**
 * 꿈 분석 (Claude)
 */
async function analyzeDream(content, context = {}) {
  const systemPrompt = `당신은 꿈 분석 전문가입니다. 사용자의 꿈을 분석하여 심볼, 감정, 테마, 강도를 추출합니다.
응답은 반드시 JSON 형식으로 해주세요.

JSON 스키마:
{
  "symbols": [{ "name": "심볼명", "category": "water|fire|sky|animal|person|building|nature|vehicle|food|object|abstract", "meaning": "의미" }],
  "emotions": [{ "type": "joy|sadness|fear|anger|surprise|disgust|anticipation|trust", "label": "한글명", "intensity": 0.0-1.0 }],
  "themes": ["테마1", "테마2"],
  "intensity": 1-10,
  "interpretation": "전체 해석",
  "actionSuggestion": "오늘의 제안"
}`;

  const userMessage = `다음 꿈을 분석해주세요:\n\n${content}`;

  try {
    const response = await callClaude(systemPrompt, userMessage);
    const parsed = parseJSON(response);

    // Zod 검증
    const validated = DreamAnalysisSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('[Claude] Dream analysis failed:', error);
    throw error;
  }
}

/**
 * 예보 생성 (Claude)
 */
async function generateForecast(data, context = {}) {
  const systemPrompt = `당신은 웰니스 예보 전문가입니다. 사용자의 최근 데이터를 분석하여 내일의 컨디션을 예측합니다.
의료적 진단이나 조언은 절대 하지 마세요. 참고 지표만 제공합니다.

응답은 반드시 JSON 형식으로 해주세요.

JSON 스키마:
{
  "condition": 1-5,
  "confidence": 0-100,
  "summary": "요약 문장",
  "risks": ["리스크1", "리스크2"],
  "suggestions": ["제안1", "제안2", "제안3"]
}`;

  const userMessage = `다음 데이터를 기반으로 내일 예보를 생성해주세요:\n\n${JSON.stringify(data, null, 2)}`;

  try {
    const response = await callClaude(systemPrompt, userMessage);
    const parsed = parseJSON(response);

    // Zod 검증
    const validated = ForecastSchema.parse(parsed);
    return validated;
  } catch (error) {
    console.error('[Claude] Forecast generation failed:', error);
    throw error;
  }
}

/**
 * 패턴 인사이트 생성 (Claude)
 */
async function generatePatternInsights(weeklyData) {
  const systemPrompt = `당신은 웰니스 패턴 분석 전문가입니다. 사용자의 주간 데이터를 분석하여 패턴과 상관관계를 찾습니다.
의료적 진단이나 조언은 절대 하지 마세요.

응답은 반드시 JSON 형식으로 해주세요.

JSON 스키마:
{
  "patterns": [{ "title": "패턴명", "description": "설명", "trend": "up|down|stable" }],
  "correlations": [{ "factor1": "요소1", "factor2": "요소2", "strength": 0.0-1.0, "insight": "인사이트" }],
  "weekSummary": "주간 요약"
}`;

  const userMessage = `다음 주간 데이터를 분석해주세요:\n\n${JSON.stringify(weeklyData, null, 2)}`;

  try {
    const response = await callClaude(systemPrompt, userMessage);
    return parseJSON(response);
  } catch (error) {
    console.error('[Claude] Pattern insights failed:', error);
    throw error;
  }
}

export const ClaudeAIAdapter = {
  name: 'claude',
  analyzeDream,
  generateForecast,
  generatePatternInsights,
};

export default ClaudeAIAdapter;
