import type { FoodAnalysis } from './types';

/**
 * Daily reference values used for the % AKG bars. Natrium and saturated fat follow the
 * BPOM nutrition-label reference (2150 kkal); sugar follows the Kemenkes GGL limit.
 */
export const DAILY_LIMITS = {
  sodiumMg: 1500,
  sugarG: 50,
  saturatedFatG: 20,
};

export type HealthGrade = 'A' | 'B' | 'C' | 'D';

export function healthGrade(score: number): HealthGrade {
  if (score >= 75) return 'A';
  if (score >= 55) return 'B';
  if (score >= 35) return 'C';
  return 'D';
}

/** Share of calories from each macro, so the chart reflects energy rather than raw grams. */
export function macroShares(f: Pick<FoodAnalysis, 'carbsG' | 'proteinG' | 'fatG'>) {
  const kcal = { carbs: f.carbsG * 4, protein: f.proteinG * 4, fat: f.fatG * 9 };
  const total = kcal.carbs + kcal.protein + kcal.fat;
  if (total <= 0) return { carbs: 0, protein: 0, fat: 0 };
  return { carbs: (kcal.carbs / total) * 100, protein: (kcal.protein / total) * 100, fat: (kcal.fat / total) * 100 };
}

const num = { type: 'number' } as const;
const SCHEMA = {
  type: 'object',
  required: ['isFood', 'food'],
  properties: {
    isFood: { type: 'boolean', description: 'true only if the photo mainly shows food or a drink to be consumed' },
    food: {
      type: 'object',
      required: [
        'name', 'portion', 'weightGrams', 'calories', 'carbsG', 'proteinG', 'fatG', 'sodiumMg', 'sugarG',
        'saturatedFatG', 'micros', 'vegan', 'vegetarian', 'glutenFree', 'spicyLevel', 'healthScore', 'healthNote',
      ],
      properties: {
        name: { type: 'string', description: 'Nama hidangan dalam Bahasa Indonesia, mis. "Nasi Goreng Ayam"' },
        portion: { type: 'string', description: 'Ukuran rumah tangga, mis. "1 porsi" atau "1 mangkuk"' },
        weightGrams: num,
        calories: num,
        carbsG: num,
        proteinG: num,
        fatG: num,
        sodiumMg: num,
        sugarG: num,
        saturatedFatG: num,
        micros: {
          type: 'array',
          description: '4-6 vitamin, mineral, atau serat yang paling menonjol',
          items: {
            type: 'object',
            required: ['name', 'amount', 'akgPct'],
            properties: {
              name: { type: 'string', description: 'Nama zat dalam Bahasa Indonesia, mis. "Zat Besi"' },
              amount: { type: 'string', description: 'Jumlah dengan satuan, mis. "2,1 mg"' },
              akgPct: { type: 'number', description: 'Persen AKG harian orang dewasa' },
            },
          },
        },
        vegan: { type: 'boolean' },
        vegetarian: { type: 'boolean' },
        glutenFree: { type: 'boolean' },
        spicyLevel: { type: 'integer', description: '0 tidak pedas, 1 sedikit, 2 pedas, 3 sangat pedas' },
        healthScore: { type: 'integer', description: '1-100; 75+ sehat, 35-54 sebaiknya dibatasi, <35 harus dibatasi' },
        healthNote: { type: 'string', description: 'Satu kalimat singkat Bahasa Indonesia tentang alasan skor' },
      },
    },
  },
} as const;

const PROMPT =
  'Kamu adalah ahli gizi. Lihat foto ini. Jika foto menunjukkan makanan atau minuman, perkirakan ' +
  'kandungan gizinya untuk porsi yang terlihat di foto, mengacu pada Tabel Komposisi Pangan Indonesia ' +
  'bila hidangannya lokal. Semua angka adalah estimasi untuk seluruh porsi di foto. Jika foto bukan ' +
  'makanan (mis. struk, barang, bensin), isi isFood=false dan isi field food dengan nilai kosong/nol.';

/** Flash models are on the Gemini API free tier, so analysis costs nothing without a billing account. */
const MODEL = 'gemini-3.8-flash';
/** Lighter free-tier model tried when the main one stays overloaded. */
const FALLBACK_MODEL = 'gemini-flash-lite-latest';
const endpoint = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** Attempts per model and the wait before each retry; 5xx means Gemini is temporarily overloaded. */
const RETRY_DELAYS_MS = [0, 1500, 4000];
const isTransient = (status: number) => status === 500 || status === 503 || status === 504;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

/** Calls Gemini, retrying transient overloads and then falling back to a lighter model. */
async function requestGemini(base64Jpeg: string, apiKey: string): Promise<Response> {
  const body = JSON.stringify({
    contents: [
      {
        parts: [{ inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }, { text: PROMPT }],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: SCHEMA },
  });

  let res: Response | undefined;
  for (const model of [MODEL, FALLBACK_MODEL]) {
    for (const delay of RETRY_DELAYS_MS) {
      if (delay) await sleep(delay);
      const attempt = await fetch(endpoint(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
      });
      if (!isTransient(attempt.status)) {
        // A missing fallback model should not hide the main model's real error.
        if (model === FALLBACK_MODEL && attempt.status === 404 && res) return res;
        return attempt;
      }
      res = attempt;
    }
  }
  return res!;
}

/**
 * Sends the photo to Gemini and returns its nutrition estimate,
 * or null when the photo does not show food. Throws a user-facing message on failure.
 */
export async function analyzeFood(base64Jpeg: string, apiKey: string): Promise<FoodAnalysis | null> {
  let res: Response;
  try {
    res = await requestGemini(base64Jpeg, apiKey);
  } catch {
    throw new Error('Tidak dapat terhubung. Periksa koneksi internet.');
  }

  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new Error('API key Gemini tidak valid. Periksa di Pengaturan.');
  }
  if (res.status === 429) throw new Error('Kuota gratis Gemini habis untuk sementara. Coba lagi nanti.');
  if (isTransient(res.status)) {
    throw new Error('Server Gemini sedang sibuk. Tunggu sebentar lalu coba lagi.');
  }
  if (!res.ok) throw new Error(`Analisis gagal (${res.status}). Coba lagi.`);

  const body = (await res.json()) as GeminiResponse;
  if (body.promptFeedback?.blockReason) throw new Error('Foto ini tidak dapat dianalisis.');
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new Error('Analisis gagal. Coba lagi.');

  let parsed: { isFood: boolean; food: FoodAnalysis };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Analisis gagal. Coba lagi.');
  }
  if (!parsed.isFood || !parsed.food) return null;
  const f = parsed.food;
  return {
    ...f,
    micros: Array.isArray(f.micros) ? f.micros : [],
    spicyLevel: Math.max(0, Math.min(3, Math.round(f.spicyLevel))),
    healthScore: Math.max(1, Math.min(100, Math.round(f.healthScore))),
  };
}
