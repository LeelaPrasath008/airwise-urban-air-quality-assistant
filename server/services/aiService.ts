import { ThinkingLevel } from '@google/genai';
import type { DailyRoutinePlan } from '../../src/shared/types.ts';
import { sanitizePlainText } from '../../src/shared/validation.ts';
import { GEMINI_MODEL, getGeminiClient, withRetry } from './ai/client.ts';
import { buildRuleBasedChatReply, buildRuleBasedRoutine } from './ai/ruleBasedFallback.ts';
import {
  buildChatSystemInstruction,
  buildRoutinePromptPayload,
  buildRoutineSystemInstruction,
  ROUTINE_RESPONSE_SCHEMA,
  ValidatedRoutineOutputSchema,
  type AssistantChatInput,
  type RoutineGenerationInput,
} from './ai/schemas.ts';

export type { AssistantChatInput, RoutineGenerationInput } from './ai/schemas.ts';

const ROUTINE_UNCONFIGURED_REASON =
  'Gemini API key is not configured on the server; displaying AIRWISE rule-based routine engine.';
const ROUTINE_UNAVAILABLE_REASON =
  'Live AI service is temporarily unavailable; displaying AIRWISE rule-based guidance.';
const CHAT_UNCONFIGURED_REASON =
  'Gemini API key is not configured on the server; responding with AIRWISE rule-based safety guidance.';
const CHAT_UNAVAILABLE_REASON =
  'Live AI service is temporarily unavailable; responding with AIRWISE rule-based safety guidance.';

export async function generatePersonalizedRoutine(
  input: RoutineGenerationInput
): Promise<DailyRoutinePlan> {
  const ai = getGeminiClient();
  if (!ai) {
    return buildRuleBasedRoutine(input, ROUTINE_UNCONFIGURED_REASON);
  }

  const systemInstruction = buildRoutineSystemInstruction(input);
  const prompt = buildRoutinePromptPayload(input);

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Generate a personalized low-emission, exposure-aware daily routine strictly from the untrusted profile data below:\n<user_household_context>\n${prompt}\n</user_household_context>`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: ROUTINE_RESPONSE_SCHEMA,
        },
      })
    );

    const raw = (response.text ?? '').trim();
    if (!raw) {
      throw new Error('Empty structured response');
    }

    const validated = ValidatedRoutineOutputSchema.safeParse(JSON.parse(raw));
    if (!validated.success) {
      throw new Error('Structured routine failed schema validation');
    }

    return {
      generatedAtIso: new Date().toISOString(),
      locationName: input.locationName,
      aqiAtGeneration: input.aqi,
      standard: input.standard,
      source: 'gemini_ai',
      summary: validated.data.summary,
      morning: validated.data.morning,
      afternoon: validated.data.afternoon,
      evening: validated.data.evening,
      disclaimer:
        'AI-generated practical guidance tailored to your profile and current AQI context. Not a substitute for professional medical advice; follow official local public-health advisories during severe pollution.',
    };
  } catch {
    // Never forward raw upstream SDK error strings to clients to avoid leaking internal details
    return buildRuleBasedRoutine(input, ROUTINE_UNAVAILABLE_REASON);
  }
}

export async function generateAssistantReply(input: AssistantChatInput): Promise<{
  reply: string;
  source: 'gemini_ai' | 'rule_based_fallback';
  fallbackNotice?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return buildRuleBasedChatReply(input, CHAT_UNCONFIGURED_REASON);
  }

  const systemInstruction = buildChatSystemInstruction(input);
  const conversationContents = [
    ...input.history.slice(-6).map((turn) => ({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }],
    })),
    {
      role: 'user',
      parts: [{ text: input.message }],
    },
  ];

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: conversationContents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      })
    );

    const text = sanitizePlainText(response.text ?? '', 3500);
    if (!text) {
      throw new Error('Empty reply returned');
    }

    return {
      reply: text,
      source: 'gemini_ai',
    };
  } catch {
    return buildRuleBasedChatReply(input, CHAT_UNAVAILABLE_REASON);
  }
}
