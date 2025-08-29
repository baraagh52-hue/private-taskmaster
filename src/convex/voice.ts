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
    audioData: v.string(), // base64 encoded audio
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.runQuery(internal.aiInternal.getCurrentUserInternal);
      if (!user) {
        throw new Error("User not authenticated");
      }

      // For now, we'll use browser's built-in Speech Recognition API
      // This is handled on the frontend for better real-time performance
      return {
        success: true,
        transcript: "", // Will be processed on frontend
        confidence: 1.0,
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