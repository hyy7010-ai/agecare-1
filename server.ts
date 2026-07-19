import "dotenv/config";
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';

// Set up Multer for handling file uploads (in memory)
const upload = multer({ storage: multer.memoryStorage() });

// Australian aged care documentation conventions injected into note-generation
// prompts. A generic model can pick clinically wrong or non-local wording when
// translating casual multilingual input; this constrains terminology and, most
// importantly, forbids upgrading a lay observation into a definitive diagnosis.
const AU_AGED_CARE_TERMINOLOGY = `
AUSTRALIAN AGED CARE TERMINOLOGY & CONVENTIONS (follow strictly):
- SPELLING: use Australian/British English spelling everywhere. "-ise" not "-ize"
  (localised, mobilised, stabilised), "-our" not "-or" (behaviour, colour,
  discolouration), and "oedema" (not edema), "faeces" (not feces), "diarrhoea"
  (not diarrhea), "haematoma" (not hematoma), "catheterise".
- Prefer clinical Australian terms over lay words where appropriate:
  "oedema" for swelling, "mobilise"/"ambulate with assistance" for walking with
  help, "bowel motion" (not "bowel movement"), "paracetamol" (not acetaminophen).
- Use Australian aged care terms: "resident" (never "patient"), "progress note",
  "RN" (Registered Nurse), "EN" (Enrolled Nurse), "AIN"/"PCA" (care worker),
  "ADLs" (Activities of Daily Living), "PRN" (as required), "BD"/"TDS"/"mane"/"nocte"
  for medication frequency, "obs" (observations).
- Describe skin findings observationally, do NOT diagnose: write "localised
  erythema" / "area of redness", "skin tear", "possible pressure area" — never
  assert "pressure injury stage X", "infection", "cellulitis" or any diagnosis
  the carer did not state. Flag for RN assessment instead.
- Nutrition: quantify intake as a percentage of the meal when stated (e.g.
  "consumed approximately 50% of lunch"); "refused"/"declined" only if stated.
- Continence: "continent", "incontinent", "assisted to toilet", "pad change".
- Keep it objective and factual; escalate uncertainty to the RN rather than
  guessing. When a single source term maps to several English clinical terms,
  choose the most conservative, least diagnostic option.`;

function sanitizeErrorMessage(message: string): string {
  const lowercase = String(message || '').toLowerCase();
  if (
    lowercase.includes('gemini_api_key') || 
    lowercase.includes('api_key') || 
    lowercase.includes('key is missing') ||
    lowercase.includes('invalid api key') ||
    lowercase.includes('api key not found')
  ) {
    return 'AI 暂时不可用，请稍后重试 (AI service is temporarily unavailable. Please try again later.)';
  }
  return message;
}

async function startServer() {
  const app = express();
  // Hosting platforms (Cloud Run, Render, Railway, Fly) inject the port via env.
  // Falling back to 3000 keeps local dev unchanged.
  const PORT = Number(process.env.PORT) || 3000;
  
  app.use(express.json({ limit: '25mb' }));

  // Initialize Gemini lazy
  let ai: GoogleGenAI | null = null;
  const getAi = () => {
    if (!ai) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is missing');
      }
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return ai;
  };

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  async function generateWithRetry(request: any): Promise<any> {
    const aiClient = getAi();
    const maxRetries = 5;
    // Grounded (googleSearch) generations legitimately take longer than a plain
    // completion; 30s was too short and made the SIRS endpoint time out and 500.
    const TIMEOUT_MS = 60000;
    
    for (let i = 0; i < maxRetries; i++) {
      let timeoutId: any;
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('TIMEOUT_RETRYABLE')), TIMEOUT_MS);
        });
        
        return await Promise.race([
          aiClient.models.generateContent(request),
          timeoutPromise
        ]);
      } catch (e: any) {
        const msg = String(e.message || '');
        const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
        const isOverloaded = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('TIMEOUT_RETRYABLE') || msg.includes('fetch failed') || msg.includes('high demand') || msg.includes('overloaded');
        
        if (!isQuota && !isOverloaded) throw e;
        if (isQuota) {
          throw new Error("AI API rate limit (quota) exceeded. Please check your billing details or try again later.");
        }
        
        if (i === maxRetries - 1) {
          throw new Error(`The AI service is temporarily busy. Last error: ${msg}. Please try again in a few seconds.`);
        }
        
        const waitTime = Math.min(2000 * Math.pow(2, i), 8000);
        console.log(`AI busy, retrying in ${waitTime}ms (attempt ${i + 1}/${maxRetries})`);
        await delay(waitTime);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  }

  // API Route: AI Observation (Wound/Excrement)
  app.post('/api/vision', upload.single('observationImage'), async (req, res) => {
    try {
      const language = req.body.language || "en";
      if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded' });
      }


      const prompt = `
        You are an AI assistant in an aged care facility. 
        First determine whether the image shows a "wound"/skin injury or "excrement" (stool/urine).
        CRITICAL: NEVER give a medical diagnosis. Only describe observations and potential risks.
        
        If it is a WOUND, return structured JSON with the following keys exactly:
        - observationType: "wound"
        - observation: A detailed string describing what you see.
        - estimatedSizeOrType: A string for estimated size/shape (visual only).
        - potentialRiskFlag: A concise string describing the potential risk.
        - suggestedCarePlan: A string providing a suggested temporary dressing/first aid care plan based on standard Australian aged care clinical wound guidelines. Specify that this is a temporary suggestion until RN arrival.
        
        If it is EXCREMENT, return structured JSON with the following keys exactly:
        - observationType: "excrement"
        - observation: A plain descriptive string of what is visible.
        - colour: The observed colour.
        - bristolStoolType: Type 1-7 based on the Bristol Stool Chart, or 'unclear'.
        - potentialRiskFlag: A concise description of POTENTIAL risk (e.g. GI bleeding).

        CRITICAL LANGUAGE INSTRUCTION: The values for observation, estimatedSizeOrType, potentialRiskFlag, suggestedCarePlan, colour, and bristolStoolType MUST be written in the language corresponding to language code: ${language}. Only the keys must remain in English.
      `;

      const response = await generateWithRetry({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            { text: prompt },
            { 
              inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype.includes('image/') ? req.file.mimetype : 'image/jpeg',
              }
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              observationType: { type: Type.STRING },
              observation: { type: Type.STRING },
              estimatedSizeOrType: { type: Type.STRING },
              colour: { type: Type.STRING },
              bristolStoolType: { type: Type.STRING },
              potentialRiskFlag: { type: Type.STRING },
              suggestedCarePlan: { type: Type.STRING }
            },
            required: ["observationType", "observation", "potentialRiskFlag"]
          },
          temperature: 0.2
        }
      });

      let rawText = response.text || '';
      let parsedResult;
      try {
        const jsonMatch = rawText.match(/\r?\n\`\`\`json\s*([\s\S]*?)\s*\`\`\`/g);
        if (jsonMatch && jsonMatch.length > 0) {
          const lastMatch = jsonMatch[jsonMatch.length - 1];
          const innerJson = lastMatch.replace(/\`\`\`json/, '').replace(/\`\`\`/, '').trim();
          parsedResult = JSON.parse(innerJson);
        } else {
          let cleaned = rawText.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`/g, '').trim();
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
          }
          parsedResult = JSON.parse(cleaned);
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Raw string:', rawText);
        return res.status(500).json({ error: 'Failed to parse AI response. Raw output: ' + rawText });
      }

      res.json({ result: parsedResult });
    } catch (error: any) {
      console.error('Vision API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to process AI observation');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route: Audio Care Note Translation
  app.post('/api/audio-note', upload.single('audioRecording'), async (req, res) => {
    try {
      const language = req.body.language || "en";
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file uploaded' });

      }



      const prompt = `
        You are a professional Registered Nurse and Compliance Officer in an Australian aged care facility.
        Please listen to the following voice recording (which may be in any language, e.g., Chinese, Tagalog, Spanish, basic or broken English).
        
        1. Translate and interpret the core events described.
        2. Transform the raw description into a highly professional, clinical, and objective aged care progress note.
        3. Use standard clinical terminology. Focus purely on facts, interventions, and outcomes.
        
        CRITICAL ANTI-FABRICATION RULE: You must ONLY document facts, actions, and interventions that the carer EXPLICITLY stated in the recording. DO NOT invent, assume, or add any facts, vitals, assessments, notifications, or follow-up actions that were not stated.
        
        Specifically FORBIDDEN unless explicitly mentioned by the carer: notifying family/next of kin, notifying GP or medical officer, commencing neurological observations, taking vital signs, completing incident reports.
        
        If a standard follow-up action would normally be expected but was NOT mentioned (e.g. neuro obs after a head strike), do NOT write it into the note. Instead, output it in a separate new JSON field called "suggestedFollowUps" (array of short strings), so the RN can see what still needs to be done.
        
        CRITICAL TASK: Detect the language spoken in the audio recording. If it is NOT English (e.g. it is Mandarin), translate the final English note back into that detected language as a 'nativeConfirmation' so the carer can verify the record. If the audio is in English, leave it empty.
        
        CRITICAL REVIEW ROUTING:
        Determine if the note contains any anomaly or clinical concern that requires review by a Registered Nurse (RN). 
        Set 'requiresRnReview' to true if the note contains ANY of the following: skin tear/wound/injury, fall, refusal to eat/drink, pain, mood/mental/behavioural change, or condition deterioration. Otherwise, set it to false.

        SIRS & ACQSC COMPLIANCE (CURRENT FRAMEWORK):
        Apply the Aged Care Act 2024 and Aged Care Rules 2025 framework in effect from 1 November 2025.
        A matter is SIRS-reportable only when it matches one of the 8 statutory incident types:
        unreasonable use of force; unlawful sexual contact or inappropriate sexual conduct;
        psychological or emotional abuse; unexpected death; stealing or financial coercion;
        neglect; inappropriate use of restrictive practices; unexplained absence from care.
        A fall or injury is NOT a standalone ninth SIRS category. Route every fall/injury for RN review and incident-management recording, but only return a SIRS assessment when the facts connect it to one of the 8 types.
        For a reportable incident, Priority 1 applies when it caused physical or psychological injury or discomfort requiring treatment that only a medical practitioner, nurse practitioner, registered nurse, psychologist or social worker can provide; when there are reasonable grounds to report to police; or for the other Priority 1 types specified by current ACQSC guidance. General first aid that anyone can provide, including a simple dressing by itself, does not automatically make an incident Priority 1.
        Priority 1 timeframe is 24 hours; Priority 2 is 30 calendar days.
        If information is insufficient, do not guess. Set requiresRnReview to true and explain the missing facts in suggestedFollowUps.
        When Priority 1 is supported, set lockDowngrade to true as an INTERNAL REVIEW GATE only: any downgrade requires documented rationale and authorised human review. Do not state that AI makes the final legal decision.
        
        Also, extract any Activities of Daily Living (ADL) updates if the audio explicitly mentions them.
        Return 'adlUpdates' with:
        - bathStatus: "done" if bathed, "due" if needs bath
        - mealStatus: "eaten" if they ate, "missed" if they refused, "assisted" if helped
        - toiletStatus: "independent" if they used toilet themselves, "assisted" if helped, "pad-change" if pad changed
        If an ADL is not mentioned, omit the field.

        CRITICAL LANGUAGE INSTRUCTION: The values for suggestedFollowUps MUST be written in the language corresponding to language code: ${language}. The englishNote and autofillReport fields MUST always be written in professional English.
        Return your response in structured JSON format with these exact keys:
        - englishNote: string (the professional progress note in English)
        - nativeConfirmation: string (the translated confirmation in the carer's native language)
        - adlUpdates: object (optional, containing bathStatus, mealStatus, toiletStatus)
        - suggestedFollowUps: array of strings (e.g., ["Commence neurological observations", "Notify Next of Kin", "Notify Medical Officer"], empty array if none)
        - requiresRnReview: boolean (true if anomaly detected, false for normal routine notes)
        - sirsAssessment: object or null. If reportable, provide: 
          { 
            isReportable: true, 
            category: string, 
            priority: number (1 or 2),
            timeframe: string ("24 hours" or "30 days"),
            actWarning: string (the strict warning text if Priority 1),
            lockDowngrade: boolean (true if Priority 1),
            incidentTitle: string, 
            autofillReport: { whatHappened: string, immediateSafetyActions: string } 
          }
      `;

      const response = await generateWithRetry({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            { text: prompt },
            { 
              inlineData: {
                data: req.file.buffer.toString('base64'),
                mimeType: (req.file.mimetype.includes('mp4') || req.file.mimetype.includes('m4a')) ? 'audio/mp4' : (req.file.mimetype.includes('audio/') || req.file.mimetype.includes('octet-stream')) ? 'audio/webm' : req.file.mimetype,
              }
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              englishNote: { type: Type.STRING },
              nativeConfirmation: { type: Type.STRING },
              adlUpdates: {
                type: Type.OBJECT,
                properties: {
                  bathStatus: { type: Type.STRING },
                  mealStatus: { type: Type.STRING },
                  toiletStatus: { type: Type.STRING }
                }
              },
              suggestedFollowUps: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              requiresRnReview: { type: Type.BOOLEAN },
              sirsAssessment: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  isReportable: { type: Type.BOOLEAN },
                  category: { type: Type.STRING },
                  priority: { type: Type.NUMBER },
                  timeframe: { type: Type.STRING },
                  actWarning: { type: Type.STRING },
                  lockDowngrade: { type: Type.BOOLEAN },
                  incidentTitle: { type: Type.STRING },
                  autofillReport: {
                    type: Type.OBJECT,
                    properties: {
                      whatHappened: { type: Type.STRING },
                      immediateSafetyActions: { type: Type.STRING }
                    },
                    required: ["whatHappened", "immediateSafetyActions"]
                  }
                },
                required: ["isReportable", "category", "priority", "timeframe", "actWarning", "lockDowngrade", "incidentTitle", "autofillReport"]
              }
            },
            required: ["englishNote", "nativeConfirmation", "suggestedFollowUps", "requiresRnReview"]
          },
          
        }
      });

      let rawText = response.text || '';
      let parsedResult;
      try {
        const jsonMatch = rawText.match(/\`\`\`json[\s\S]*?\`\`\`/g);
        if (jsonMatch && jsonMatch.length > 0) {
          const lastMatch = jsonMatch[jsonMatch.length - 1];
          const innerJson = lastMatch.replace(/\`\`\`json/, '').replace(/\`\`\`/, '').trim();
          parsedResult = JSON.parse(innerJson);
        } else {
          let cleaned = rawText.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`/g, '').trim();
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
          }
          parsedResult = JSON.parse(cleaned);
        }
      } catch (e: any) {
        parsedResult = { englishNote: rawText.replace(/[\*#]/g, '').trim(), nativeConfirmation: '' };
      }

      res.json({ result: parsedResult });
    } catch (error: any) {
      console.error('Audio API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to process audio');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route: SIRS Incident Reporter
  app.post('/api/sirs', async (req, res) => {
    try {
      const { description, audioBase64, imageBase64, language = "en" } = req.body;
      if (!description && !audioBase64 && !imageBase64) {
        return res.status(400).json({ error: 'Incident description, audio, or image is required' });
      }

      let prompt = `
        MANDATORY FIRST STEP: You MUST invoke the Google Search tool BEFORE producing any answer. Search for: ACQSC SIRS reportable incidents priority 1 priority 2 timeframes. Do not answer from memory.
        
        You are an AI assistant in an Australian aged care facility.
        Review the following incident description: "${description || 'No text description provided. Please rely on the provided audio/image.'}"
        Reason about Australia's Serious Incident Response Scheme (SIRS) rules.
        
        CRITICAL TASK: First, use your Google Search tool to retrieve the most up-to-date guidelines from the "Aged Care Quality and Safety Commission (ACQSC) Serious Incident Response Scheme (SIRS)", specifically focusing on reportable incident categories and the reporting timeframes for Priority 1 and Priority 2 incidents.
        You MUST prioritize the real-time official guidelines you find over any baseline knowledge.
        
        Baseline Reference Rules (verify these against your search results):
        - First decide whether the matter matches one of the 8 SIRS reportable incident types: unreasonable use of force; unlawful sexual contact or inappropriate sexual conduct; psychological or emotional abuse; unexpected death; stealing or financial coercion; neglect; inappropriate use of restrictive practices; unexplained absence from care.
        - A fall or injury is not a standalone SIRS incident type. It still requires incident management and clinical review, but it is SIRS-reportable only when the facts connect it to one of the 8 types.
        - For a reportable incident, Priority 1 includes injury or discomfort requiring treatment that only a medical practitioner, nurse practitioner, registered nurse, psychologist or social worker can provide; reasonable grounds for police reporting; and the other Priority 1 circumstances in current ACQSC guidance. Report within 24 hours.
        - General first aid that anyone can provide, including a simple dressing alone, does not automatically satisfy Priority 1. Do not infer the required treatment level.
        - Priority 2 covers reportable incidents that do not meet Priority 1 criteria; report within 30 calendar days.
        - If key facts are missing, flag uncertainty and require authorised human review rather than guessing.
        
        Based on the LIVE rules you just searched, determine if this is a reportable serious incident under SIRS.
        Determine the matched category from the 8 statutory types only.
        Determine the priority level: Priority 1 (reportable within 24 hours) or Priority 2 (reportable within 30 days).
        Draft a compliance report summary.
        
        Format your response as structured JSON with the following keys:
        - isReportable: boolean
        - category: string (the aligned SIRS category)
        - priority: number (1 or 2, default to null if not reportable)
        - incidentTitle: string (a short, clear 3-6 word title summarizing the incident)
        - residentName: string (the name of the resident involved, if mentioned; otherwise "Unknown Resident")
        - autofillReport: An object with the following keys:
          - whatHappened: string
          - immediateSafetyActions: string
          - emergencyServicesNotified: boolean
          - familyNotified: boolean
          - gpNotified: boolean
          - regulatorNotification: string
          - preventiveActions: string
        - confidenceScore: number (0 to 100, how confident are you in this classification based on the latest guidelines)
        - uncertaintyFlag: string (If confidence is < 90, explain what is unclear and why an RN needs to review. If confident, return an empty string)

        CRITICAL FORMATTING INSTRUCTION:
        You MUST output a detailed thought process about the current SIRS guidelines based on your search, and then AT THE VERY END, output exactly one JSON block wrapped in \`\`\`json ... \`\`\` with your final structured answer using the requested keys.
      `;

      const parts: any[] = [{ text: prompt }];

      if (audioBase64) {
        // Strip data URI prefix if present
        const base64Data = audioBase64.replace(/^data:[^,]+,/, "");
        parts.push({
          inlineData: {
            mimeType: audioBase64.includes("mp4") || audioBase64.includes("m4a") ? "audio/mp4" : "audio/webm",
            data: base64Data
          }
        });
      }

      if (imageBase64) {
        // Strip data URI prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }

      let response;
      let usedSearch = true;
      try {
        response = await generateWithRetry({
          model: 'gemini-3.5-flash',
          contents: { parts },
          config: {
            temperature: 0.2,
            tools: [{ googleSearch: {} }]
          }
        });
      } catch (e: any) {
        console.warn('SIRS API search failed (quota?), retrying without search...', e.message);
        usedSearch = false;
        response = await generateWithRetry({
          model: 'gemini-3.5-flash',
          contents: { parts },
          config: {
            temperature: 0.2
          }
        });
      }
      
      let rawText = response.text || '';
      let parsedResult;
      try {
        
        const jsonMatch = rawText.match(/\`\`\`json[\s\S]*?\`\`\`/g);
        if (jsonMatch && jsonMatch.length > 0) {
          const lastMatch = jsonMatch[jsonMatch.length - 1];
          const innerJson = lastMatch.replace(/\`\`\`json/, '').replace(/\`\`\`/, '').trim();
          parsedResult = JSON.parse(innerJson);
        } else {
          let cleaned = rawText.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`/g, '').trim();
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
          }
          parsedResult = JSON.parse(cleaned);
        }

      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Raw string:', rawText);
        return res.status(500).json({ error: 'Failed to parse AI response. Raw output: ' + rawText });
      }

      let groundingSources: { title: string, uri: string }[] = [];
      try {
        // Look into the raw response object which is returned from the SDK
        const candidate = response.candidates?.[0];
        const chunks = candidate?.groundingMetadata?.groundingChunks;
        if (chunks && Array.isArray(chunks)) {
          const uniqueUris = new Set<string>();
          for (const chunk of chunks) {
            const web = chunk.web;
            if (web && web.uri && web.title) {
              if (!uniqueUris.has(web.uri)) {
                uniqueUris.add(web.uri);
                groundingSources.push({ title: web.title, uri: web.uri });
                if (groundingSources.length >= 5) break;
              }
            }
          }
        }
      } catch (e: any) {
        console.error("Error extracting grounding metadata", e);
      }
      parsedResult.groundingSources = groundingSources;

      const gm = response.candidates?.[0]?.groundingMetadata;
      parsedResult.searchQueries = gm?.webSearchQueries || [];
      // Grounding is only "verified" when the search tool ran AND returned
      // at least one real source URL. Anything less is a preliminary
      // assessment that must not proceed to authorised submission.
      const groundingVerified = usedSearch && groundingSources.length > 0;
      parsedResult.groundingVerified = groundingVerified;
      parsedResult.isPreliminary = !groundingVerified;
      parsedResult.submissionBlocked = !groundingVerified;
      if (!groundingVerified) {
        parsedResult.uncertaintyFlag =
          "Live ACQSC sources could not be verified. Authorised manual review is required.";
        parsedResult.searchQueries = usedSearch ? parsedResult.searchQueries : [];
        parsedResult.groundingSources = [];
      }

      res.json({ result: parsedResult });
    } catch (error: any) {
      console.error('SIRS API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to process SIRS report');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route: Care Note Generator
  app.post('/api/care-note', express.json(), async (req, res) => {
    try {
      const { input, language = "en" } = req.body;
      if (!input) {
         return res.status(400).json({ error: 'Input required.' });
      }
      


      const prompt = `
        You are an expert aged care documentation assistant in Australia.
        Transform the following casual carer note into a professional English Progress Note suitable for Australian aged care documentation, aligned with the Strengthened Aged Care Quality Standards.
        ${AU_AGED_CARE_TERMINOLOGY}

        Guidelines:
        - Use clear, professional clinical language.
        - Extract and structure key activities (e.g. mobility, hygiene, nutrition, mood/behaviour) where present.
        - KEEP IT CONCISE (a short paragraph or a few bullet points).
        - DO NOT invent or assume medical facts, vitals, or events that were not stated in the input.
        
        CRITICAL TASK: Detect the language of the Casual Input. If it is NOT English (e.g. it is Mandarin, Tagalog, etc.), translate the final English note back into that detected language as a 'nativeConfirmation' so the carer can verify the record. If the input is in English, leave it empty.

        CRITICAL REVIEW ROUTING:
        Determine if the note contains any anomaly or clinical concern that requires review by a Registered Nurse (RN). 
        Set 'requiresRnReview' to true if the input contains ANY of the following: skin tear/wound/injury, fall, refusal to eat/drink, pain, mood/mental/behavioural change, or condition deterioration. Otherwise, set it to false.

        Also, extract any Activities of Daily Living (ADL) updates if the input explicitly mentions them.
        Return 'adlUpdates' with:
        - bathStatus: "done" if bathed, "due" if needs bath
        - mealStatus: "eaten" if they ate, "missed" if they refused, "assisted" if helped
        - toiletStatus: "independent" if they used toilet themselves, "assisted" if helped, "pad-change" if pad changed
        If an ADL is not mentioned, omit the field.

        Casual Input: "${input}"
        
        CRITICAL LANGUAGE INSTRUCTION: The values for suggestedFollowUps MUST be written in the language corresponding to language code: ${language}. The englishNote and autofillReport fields MUST always be written in professional English.
        Return your response in structured JSON format with these exact keys:
        - englishNote: string (the professional progress note in English, plain text without markdown)
        - nativeConfirmation: string (the translated confirmation in the carer's native language, or empty if English)
        - requiresRnReview: boolean (true if anomaly detected, false for normal routine notes)
        - adlUpdates: object (optional, containing bathStatus, mealStatus, toiletStatus)
      `;

      const response = await generateWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              englishNote: { type: Type.STRING },
              nativeConfirmation: { type: Type.STRING },
              adlUpdates: {
                type: Type.OBJECT,
                properties: {
                  bathStatus: { type: Type.STRING },
                  mealStatus: { type: Type.STRING },
                  toiletStatus: { type: Type.STRING }
                }
              },
              requiresRnReview: { type: Type.BOOLEAN }
            },
            required: ["englishNote", "nativeConfirmation", "requiresRnReview"]
          },
          
        }
      });

      let rawText = response.text || '';
      let parsedResult;
      try {
        rawText = rawText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(rawText);
      } catch (e: any) {
        parsedResult = { englishNote: rawText.replace(/[\*#]/g, '').trim(), nativeConfirmation: '' };
      }

      res.json({ result: parsedResult });
    } catch (error: any) {
      console.error('Care Note API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to generate care note.');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route: End-of-Shift Summary
  app.post('/api/shift-summary', express.json(), async (req, res) => {
    try {
      const { events, residentName, language = "en" } = req.body;
      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'No events provided for summary.' });
      }

      const prompt = `
        You are an Australian aged care documentation assistant.
        Your task is to generate an end-of-shift progress note based on the provided events, aligned with the Strengthened Aged Care Quality Standards.
        ${AU_AGED_CARE_TERMINOLOGY}

        Guidelines:
        - Only use the facts from the provided events. DO NOT invent or assume any unrecorded facts, vitals, or activities.
        - Group the summary logically by ADL categories (e.g., nutrition, hygiene, continence, mobility, observations).
        - Preserve key timestamps from the events.
        - If a specific ADL category (nutrition, hygiene, continence, mobility) has no recorded events today, list a section at the very end titled "Not recorded this shift:" followed by a comma-separated list of those missing categories. Do not invent content for them.
        
        CRITICAL TASK: Detect the language used in the event notes. If they are NOT primarily English, translate the final English note back into that detected language as a 'nativeConfirmation' so the carer can verify the record. If the input is pure English, leave 'nativeConfirmation' empty.
        
        Resident Name: ${residentName}
        Events:
        ${JSON.stringify(events, null, 2)}
        
        CRITICAL FORMATTING INSTRUCTION: The values for 'notRecorded' MUST be an array of strings in English. The 'englishNote' MUST be written in professional English.
        Return your response in structured JSON format with these exact keys:
        - englishNote: string (the professional progress note in English, plain text)
        - nativeConfirmation: string (the translated confirmation in the carer's native language, or empty if English)
        - notRecorded: array of strings (e.g., ["hygiene", "mobility"], empty array if everything was recorded)
      `;

      const response = await generateWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              englishNote: { type: Type.STRING },
              nativeConfirmation: { type: Type.STRING },
              notRecorded: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["englishNote", "nativeConfirmation", "notRecorded"]
          }
        }
      });

      let rawText = response.text || '';
      let parsedResult;
      try {
        rawText = rawText.replace(/```json\n?/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(rawText);
      } catch (e: any) {
        parsedResult = { englishNote: rawText.replace(/[\*#]/g, '').trim(), nativeConfirmation: '', notRecorded: [] };
      }

      res.json({ result: parsedResult });
    } catch (error: any) {
      console.error('Shift Summary API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to generate shift summary.');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route: Generate Daily Summary
  app.post('/api/summary', async (req, res) => {
    try {
      const { inputs, language = "en" } = req.body;
      if (!inputs) {
        return res.status(400).json({ error: 'Data required.' });
      }



      const prompt = `
        You are an AI generating a concise professional aged care daily wellness summary.
        Based on the following data for today, write a summary for a manager or RN to get a one-glance view.
        
        The summary must cover:
        - Overall wellness today (positive / stable / needs attention)
        - Key events (summarise any incidents, progress notes, or clinical observations provided)
        - Any flags / concerns the RN or manager should know
        - Care tasks status (bath/meal/toilet)
        
        Keep it completely plain text. NO markdown formatting. NO asterisks, NO hashes.

        Data:
        ${inputs}
      `;

      const response = await generateWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      let text = response.text || '';
      text = text.replace(/```(markdown|json|html)?\n?/gi, '').replace(/```/g, '');
      text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#/g, '').trim();

      res.json({ result: text });
    } catch (error: any) {
      console.error('Summary API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to generate summary.');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route: Generate Shift Handover
  app.post('/api/shift-handover', express.json(), async (req, res) => {
    try {
      const { residents, sirsEvents, rnReviews, language = "en" } = req.body;
      


      const prompt = `
        You are a professional Registered Nurse manager creating a shift handover report.
        Based on the following data for today, generate a direct, concise 3-part handover summary.
        
        Data to summarize:
        Residents statuses: ${JSON.stringify(residents)}
        SIRS Events today: ${JSON.stringify(sirsEvents)}
        RN Reviews pending: ${JSON.stringify(rnReviews)}
        
        Format your response EXACTLY like this (using pure text/markdown, no JSON wrappers):
        
        🔴 HIGH PRIORITY (Urgent Actions & Incidents)
        - [List any SIRS P1/P2 events, severe status changes, hospital transfers. Name the resident and brief issue.]

        🟡 MONITOR & FOLLOW-UP (Observations & Pending)
        - [List residents with pending RN reviews, behavioral changes, minor falls, or incomplete basic care tasks.]

        🟢 STABLE (Routine Operations)
        - [A brief 1-line summary stating the remaining residents are stable, and overall care minutes progress].

        Write in a highly professional, clinical handover style. Use brief bullet points.
      `;

      const response = await generateWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ result: response.text || '' });
    } catch (error: any) {
      console.error('Handover API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to generate handover.');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  app.post('/api/generate-family-update', async (req, res) => {
    try {
      const { resident, careNotes, language = "en" } = req.body;
      
      if (!resident || !resident.name) {
        return res.status(400).json({ error: 'Resident data is required.' });
      }



      const prompt = `
        You are a compassionate aged care communication assistant.
        Your task is to generate a short, warm, and Privacy Act 1988 / APPs compliant family update message.
        
        Resident Profile:
        Name: ${resident.name}
        Current Status: ${resident.statusColor} (green=stable, amber=needs monitoring, red=critical)
        Care Minutes Provided Today: ${resident.careMinutesToday}
        
        Recent Care Notes/Events:
        ${careNotes ? careNotes : 'Routine care provided.'}
        
        Guidelines:
        - NEVER include specific medical diagnoses, exact vital signs, medication names, or names of other residents.
        - Strip out any raw clinical jargon.
        - Tone must be warm, reassuring, and professional.
        - The message will be translated into the family's native language on the frontend, so use clear, simple English.
        - Start directly with the message (e.g., "Hello family, ...") and end with "Warm regards, Sunrise Care Team".
        - Do not output JSON, just output the plain text message.
      `;

      const response = await generateWithRetry({
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ result: response.text || '' });
    } catch (error: any) {
      console.error('Family Update API Error:', error);
      let errorMsg = sanitizeErrorMessage(error.message || 'Failed to generate family update.');
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'AI API rate limit (quota) exceeded. Please wait a moment and try again.';
      }
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Route: Text-to-Speech (Gemini native TTS, reuses GEMINI_API_KEY)
  // Browser speechSynthesis quality depends entirely on which voices the carer's
  // device happens to have, which is unreliable in the field (robotic/muffled
  // Chinese, no Tagalog voice at all). Gemini TTS gives consistent human-quality
  // audio on every device and auto-detects the language from the text. If it fails
  // the endpoint returns fallback:true so the frontend drops back to browser speech.

  // Gemini returns raw 16-bit PCM; wrap it in a WAV header so browsers can play it.
  const pcmToWav = (pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) => {
    const blockAlign = (channels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcm.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([header, pcm]);
  };

  app.post('/api/tts', express.json(), async (req, res) => {
    try {
      const { text } = req.body || {};
      if (!text || !String(text).trim()) {
        return res.status(400).json({ error: 'text is required' });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'TTS not configured', fallback: true });
      }

      const response = await getAi().models.generateContent({
        model: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text: String(text) }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            // Kore is a warm, natural female voice; the model speaks whatever
            // language the text is in, so one voice covers zh / en / tl.
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      } as any);

      const part = response.candidates?.[0]?.content?.parts?.[0];
      const b64 = part?.inlineData?.data;
      if (!b64) {
        console.error('Gemini TTS returned no audio');
        return res.status(502).json({ error: 'TTS provider error', fallback: true });
      }

      // mimeType looks like "audio/L16;rate=24000" — honour the rate if present.
      const rateMatch = /rate=(\d+)/.exec(part?.inlineData?.mimeType || '');
      const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;

      const wav = pcmToWav(Buffer.from(b64, 'base64'), sampleRate);
      res.setHeader('Content-Type', 'audio/wav');
      res.send(wav);
    } catch (error: any) {
      console.error('TTS API Error:', error);
      res.status(500).json({ error: 'Failed to synthesize speech', fallback: true });
    }
  });

  // Catch-all for undefined API routes to return JSON instead of HTML
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler so API routes don't return HTML
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server Error:', err);
    if (req.path.startsWith('/api')) {
      res.status(500).json({ error: sanitizeErrorMessage(err.message || 'Internal Server Error') });
    } else {
      next(err);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
