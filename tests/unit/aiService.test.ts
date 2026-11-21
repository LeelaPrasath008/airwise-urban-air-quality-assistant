// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import {
  getGeminiClient,
  resetGeminiClientCache,
  withRetry,
  withTimeout,
} from '../../server/services/ai/client.ts';
import {
  ValidatedRoutineOutputSchema,
  type AssistantChatInput,
  type RoutineGenerationInput,
} from '../../server/services/ai/schemas.ts';
import {
  generateAssistantReply,
  generatePersonalizedRoutine,
} from '../../server/services/aiService.ts';

const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (ORIGINAL_GEMINI_KEY === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_KEY;
  }
  resetGeminiClientCache();
});

const SAMPLE_ROUTINE_INPUT: RoutineGenerationInput = {
  locationName: 'New Delhi, India',
  standard: 'INDIA_CPCB',
  aqi: 342,
  categoryLabel: 'Very Poor',
  pm25: 176.4,
  pm10: 294.2,
  temperatureC: 14,
  humidityPercent: 68,
  weatherCondition: 'Hazy winter morning',
  profile: {
    occupation: 'Office commuter',
    typicalCommute: 'car_solo',
    householdSize: 4,
    indoorVentilation: 'hepa_purifier',
    preferredTransport: 'metro_bus',
    worksOutdoors: false,
    householdNotes: 'Parents and one school-age child',
  },
};

const SAMPLE_CHAT_INPUT: AssistantChatInput = {
  message: 'Is it safe to go for an outdoor run this morning?',
  history: [],
  context: {
    locationName: 'New Delhi, India',
    standard: 'INDIA_CPCB',
    aqi: 342,
    categoryLabel: 'Very Poor',
    pm25: 176.4,
    pm10: 294.2,
    temperatureC: 14,
    humidityPercent: 68,
    weatherCondition: 'Hazy winter morning',
    isDemonstrationData: true,
  },
};

describe('AI client management & resilience utilities', () => {
  it('returns null for missing or placeholder GEMINI_API_KEY values', () => {
    delete process.env.GEMINI_API_KEY;
    expect(getGeminiClient()).toBeNull();

    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    expect(getGeminiClient()).toBeNull();

    process.env.GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';
    expect(getGeminiClient()).toBeNull();
  });

  it('memoizes the client for identical keys and recreates it on key rotation', () => {
    process.env.GEMINI_API_KEY = 'test-key-alpha-12345';
    const first = getGeminiClient();
    const second = getGeminiClient();

    expect(first).not.toBeNull();
    expect(second).toBe(first);

    process.env.GEMINI_API_KEY = 'test-key-beta-67890';
    const rotated = getGeminiClient();
    expect(rotated).not.toBeNull();
    expect(rotated).not.toBe(first);

    delete process.env.GEMINI_API_KEY;
    expect(getGeminiClient()).toBeNull();
  });

  it('resolves fast promises and rejects promises that exceed timeout', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100)).resolves.toBe('ok');

    const slow = new Promise<string>((resolve) => {
      setTimeout(() => resolve('late'), 200);
    });
    await expect(withTimeout(slow, 15)).rejects.toThrow('AI request timed out');
  });

  it('retries transient failures and succeeds on a subsequent attempt', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('transient error');
        }
        return 'recovered';
      },
      2,
      100,
      10
    );

    expect(result).toBe('recovered');
    expect(attempts).toBe(2);
  });

  it('rethrows the last error after exhausting retry attempts', async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error(`failure-${attempts}`);
        },
        2,
        100,
        10
      )
    ).rejects.toThrow('failure-2');
    expect(attempts).toBe(2);
  });
});

describe('AI output validation and rule-based fallback', () => {
  it('sanitizes routine output fields and rejects structurally invalid payloads', () => {
    const validItem = {
      id: 'm-1',
      title: 'Keep windows closed <script>alert(1)</script>',
      whatToDo: 'Seal exterior doors and windows during inversion.',
      whyRecommended: 'High outdoor PM2.5 penetrates indoors rapidly.',
      howToImplement: 'Close windows and run a True HEPA purifier.',
      environmentalBenefit: 'Reduces heating energy loss.',
      healthConsideration: 'Lowers fine particulate inhalation.',
      effortOrCost: 'Zero cost',
      impactCategory: 'clean_indoor_air' as const,
    };

    const parsed = ValidatedRoutineOutputSchema.safeParse({
      summary: 'Tailored routine for New Delhi high smog conditions.',
      morning: [validItem],
      afternoon: [validItem],
      evening: [validItem],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.morning[0].title).not.toContain('<');
      expect(parsed.data.morning[0].title).not.toContain('>');
    }

    const invalid = ValidatedRoutineOutputSchema.safeParse({
      summary: 'short',
      morning: [],
      afternoon: [],
      evening: [],
    });
    expect(invalid.success).toBe(false);
  });

  it('returns complete rule-based routine guidance when Gemini API key is unconfigured', async () => {
    delete process.env.GEMINI_API_KEY;
    const plan = await generatePersonalizedRoutine(SAMPLE_ROUTINE_INPUT);

    expect(plan.source).toBe('rule_based_fallback');
    expect(plan.locationName).toBe('New Delhi, India');
    expect(plan.aqiAtGeneration).toBe(342);
    expect(plan.morning.length).toBe(2);
    expect(plan.afternoon.length).toBe(2);
    expect(plan.evening.length).toBe(2);

    for (const item of [...plan.morning, ...plan.afternoon, ...plan.evening]) {
      expect(item.whatToDo.length).toBeGreaterThan(0);
      expect(item.whyRecommended.length).toBeGreaterThan(0);
      expect(item.howToImplement.length).toBeGreaterThan(0);
      expect(item.environmentalBenefit.length).toBeGreaterThan(0);
      expect(item.healthConsideration.length).toBeGreaterThan(0);
      expect(item.effortOrCost.length).toBeGreaterThan(0);
    }

    expect(plan.morning[0].howToImplement).toContain('HEPA purifier');
    expect(plan.evening[0].healthConsideration).toContain('Parents and one school-age child');
  });

  it('returns contextual rule-based chat reply with demonstration data disclosure when unconfigured', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await generateAssistantReply(SAMPLE_CHAT_INPUT);

    expect(res.source).toBe('rule_based_fallback');
    expect(res.reply).toContain('New Delhi, India');
    expect(res.reply).toContain('NOT advisable');
    expect(res.reply).toContain('demonstration AQI data');
    expect(res.fallbackNotice).toContain('rule-based');
  });
});
