"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Text-to-Speech using Cartesia
export const textToSpeech = action({
  args: {
    text: v.string(),
    voiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.runQuery(internal.aiInternal.getCurrentUserInternal);
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Use Web Speech API fallback if Cartesia is not available
      // This will be handled on the frontend for better browser compatibility
      return {
        success: true,
        audioUrl: null, // Will use browser's built-in TTS
        text: args.text,
        voiceId: args.voiceId || "default",
      };
    } catch (error) {
      console.error("TTS error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "TTS failed",
        text: args.text,
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
