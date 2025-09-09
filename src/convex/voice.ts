"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Enhanced Text-to-Speech with Coqui TTS support
export const textToSpeech = action({
  args: {
    text: v.string(),
    voiceId: v.optional(v.string()),
    model: v.optional(v.string()),
    speakerId: v.optional(v.string()),
    languageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.runQuery(internal.aiInternal.getCurrentUserInternal);
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Try Coqui TTS first if server URL is configured
      const coquiServerUrl = process.env.COQUI_TTS_SERVER_URL;
      
      if (coquiServerUrl) {
        try {
          const coquiResult = await generateCoquiTTS(args.text, {
            serverUrl: coquiServerUrl,
            model: args.model,
            speakerId: args.speakerId,
            languageId: args.languageId,
          });
          
          if (coquiResult.success) {
            return {
              success: true,
              audioUrl: coquiResult.audioUrl,
              audioData: coquiResult.audioData,
              text: args.text,
              voiceId: args.voiceId || "coqui-default",
              provider: "coqui",
              duration: coquiResult.duration,
            };
          }
        } catch (coquiError) {
          console.warn("Coqui TTS failed, falling back to browser TTS:", coquiError);
        }
      }

      // Fallback to browser TTS
      return {
        success: true,
        audioUrl: null, // Will use browser's built-in TTS
        text: args.text,
        voiceId: args.voiceId || "browser-default",
        provider: "browser",
        fallback: true,
      };
    } catch (error) {
      console.error("TTS error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "TTS failed",
        text: args.text,
        provider: "none",
      };
    }
  },
});

// Coqui TTS generation function
async function generateCoquiTTS(text: string, options: {
  serverUrl: string;
  model?: string;
  speakerId?: string;
  languageId?: string;
}) {
  const { serverUrl, model, speakerId, languageId } = options;
  
  try {
    const requestBody: any = { text };
    
    if (model) requestBody.model_name = model;
    if (speakerId) requestBody.speaker_id = speakerId;
    if (languageId) requestBody.language_id = languageId;

    const response = await fetch(`${serverUrl}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Coqui TTS server responded with ${response.status}: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioData = Buffer.from(audioBuffer).toString('base64');
    
    return {
      success: true,
      audioData,
      audioUrl: `data:audio/wav;base64,${audioData}`,
      duration: null, // Could be calculated if needed
    };
  } catch (error) {
    console.error("Coqui TTS generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Get available Coqui TTS models
export const getCoquiModels = action({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await ctx.runQuery(internal.aiInternal.getCurrentUserInternal);
      if (!user) {
        throw new Error("User not authenticated");
      }

      const coquiServerUrl = process.env.COQUI_TTS_SERVER_URL;
      
      if (!coquiServerUrl) {
        return {
          success: false,
          error: "Coqui TTS server not configured",
          models: [],
        };
      }

      const response = await fetch(`${coquiServerUrl}/api/tts/models`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const models = await response.json();
      
      return {
        success: true,
        models,
        serverUrl: coquiServerUrl,
      };
    } catch (error) {
      console.error("Failed to get Coqui models:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get models",
        models: [],
      };
    }
  },
});

// Check Coqui TTS server status
export const checkCoquiStatus = action({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await ctx.runQuery(internal.aiInternal.getCurrentUserInternal);
      if (!user) {
        throw new Error("User not authenticated");
      }

      const coquiServerUrl = process.env.COQUI_TTS_SERVER_URL;
      
      if (!coquiServerUrl) {
        return {
          available: false,
          configured: false,
          error: "Coqui TTS server URL not configured",
        };
      }

      try {
        // Use AbortController to implement timeout
        const controller = new AbortController();
        const abortId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${coquiServerUrl}/api/tts`, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(abortId);

        return {
          available: response.ok,
          configured: true,
          serverUrl: coquiServerUrl,
          status: response.status,
        };
      } catch (error) {
        return {
          available: false,
          configured: true,
          serverUrl: coquiServerUrl,
          error: error instanceof Error ? error.message : "Connection failed",
        };
      }
    } catch (error) {
      return {
        available: false,
        configured: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Speech-to-Text processing
export const speechToText = action({
  args: {
    audioData: v.string(), // base64 encoded audio (no data URL prefix)
    language: v.optional(v.string()),
    // Add: optional MIME type hint, e.g. "audio/webm" | "audio/wav" | "audio/ogg"
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.runQuery(internal.aiInternal.getCurrentUserInternal);
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Convert base64 string to a Blob for multipart upload
      const buffer = Buffer.from(args.audioData, "base64");
      const mime = args.mimeType || "audio/webm";
      const fileExt =
        mime === "audio/wav"
          ? "wav"
          : mime === "audio/ogg"
          ? "ogg"
          : mime === "audio/mpeg"
          ? "mp3"
          : "webm";
      const filename = `audio.${fileExt}`;
      const blob = new Blob([buffer], { type: mime });

      // 1) Prefer local STT server if configured (fully self-hosted)
      // Expected API contract:
      // - POST ${STT_LOCAL_URL} with multipart form-data:
      //    - file: audio file
      //    - language (optional)
      // - Response JSON containing one of:
      //    { text: string } or { transcript: string } or { result: { text: string } }
      const localSttUrl = process.env.STT_LOCAL_URL;
      if (localSttUrl) {
        try {
          const localForm = new FormData();
          if (args.language) localForm.append("language", args.language);
          localForm.append("file", blob, filename);

          const localResp = await fetch(localSttUrl, {
            method: "POST",
            body: localForm,
          });

          if (!localResp.ok) {
            const errText = await localResp.text().catch(() => "");
            throw new Error(
              `Local STT error: ${localResp.status} ${localResp.statusText} ${errText}`.trim(),
            );
          }

          const localData: any = await localResp.json().catch(() => ({}));
          const transcript: string =
            localData?.text ||
            localData?.transcript ||
            localData?.result?.text ||
            "";

          if (!transcript) {
            return {
              success: false,
              error: "Local STT returned empty text",
            };
          }

          return {
            success: true,
            transcript,
            confidence: localData?.confidence ?? 1.0,
            provider: "local_stt",
          };
        } catch (e) {
          // If local STT fails, fall through to OpenAI (if configured) or return an error below
          console.warn("Local STT failed, attempting OpenAI fallback if configured:", e);
        }
      }

      // 2) Fallback to OpenAI Whisper if configured
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return {
          success: false,
          error:
            "Server STT unavailable: Set STT_LOCAL_URL to your local STT server OR OPENAI_API_KEY for Whisper.",
        };
      }

      const form = new FormData();
      form.append("model", "whisper-1");
      form.append("response_format", "json");
      if (args.language) form.append("language", args.language);
      form.append("file", blob, filename);

      const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
        },
        body: form,
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(
          `OpenAI STT error: ${resp.status} ${resp.statusText} ${errText}`.trim(),
        );
      }

      const data: any = await resp.json();
      const transcript: string = data?.text || "";
      if (!transcript) {
        return {
          success: false,
          error: "Transcription returned empty text",
        };
      }

      return {
        success: true,
        transcript,
        confidence: 1.0, // Whisper API doesn't provide explicit confidence
        provider: "openai_whisper",
      };
    } catch (error) {
      console.error("STT error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "STT failed",
      };
    }
  },
});