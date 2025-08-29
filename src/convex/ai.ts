"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Ollama API integration for local Phi-3 mini
export const chatWithPhi3 = action({
  args: {
    prompt: v.string(),
    sessionId: v.optional(v.id("sessions")),
    checkinId: v.optional(v.id("checkins")),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    try {
      // Get current user
      const user = await ctx.runQuery(api.users.currentUser);
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Build context-aware prompt for accountability
      const systemPrompt = `You are an AI accountability assistant helping users stay focused and productive. Your role is to:
1. Provide gentle but firm nudges when users are procrastinating
2. Offer specific, actionable advice to get back on track
3. Celebrate progress and maintain motivation
4. Ask follow-up questions to understand the user's current state
5. Keep responses concise and encouraging (2-3 sentences max)

Context: ${args.context || "General productivity check-in"}

Respond in a supportive, understanding tone while being direct about accountability.`;

      const fullPrompt = `${systemPrompt}\n\nUser: ${args.prompt}`;

      // Call local Ollama API (assumes Ollama is running on localhost:11434)
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "phi3:mini",
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 200,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.response;
      const responseTime = Date.now() - startTime;

      // Log the interaction
      await ctx.runMutation(internal.aiInternal.logInteraction, {
        userId: user._id,
        sessionId: args.sessionId,
        checkinId: args.checkinId,
        prompt: args.prompt,
        response: aiResponse,
        model: "phi3:mini",
        responseTime,
      });

      return {
        response: aiResponse,
        responseTime,
        success: true,
      };
    } catch (error) {
      console.error("AI chat error:", error);
      
      // Fallback response if AI is unavailable
      const fallbackResponse = "I'm having trouble connecting right now, but remember: small progress is still progress. What's one tiny step you can take right now?";
      
      return {
        response: fallbackResponse,
        responseTime: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Generate accountability prompts based on session context
export const generateAccountabilityPrompt = action({
  args: {
    sessionId: v.id("sessions"),
    lastCheckinResponse: v.optional(v.string()),
    timeElapsed: v.number(), // minutes since last check-in
  },
  handler: async (
    ctx,
    args
  ): Promise<{ prompt: string; context: string; success: boolean; error?: string }> => {
    try {
      const user = await ctx.runQuery(api.users.currentUser);
      if (!user) {
        throw new Error("User not authenticated");
      }

      const session: { title: string; tasks: string[] } | null = await ctx.runQuery(
        internal.sessions.getSession,
        {
          sessionId: args.sessionId,
        },
      );

      if (!session) {
        throw new Error("Session not found");
      }

      // Generate context-aware prompts based on session progress
      let promptContext: string = `Session: "${session.title}"`;
      if (session.tasks.length > 0) {
        promptContext += `\nTasks: ${session.tasks.join(", ")}`;
      }
      
      if (args.lastCheckinResponse) {
        promptContext += `\nLast check-in: ${args.lastCheckinResponse}`;
      }

      promptContext += `\nTime elapsed: ${args.timeElapsed} minutes`;

      const prompts: string[] = [
        "How are you progressing on your current task?",
        "What's your current focus level from 1-10?",
        "Are you staying on track with your goals?",
        "What's been your biggest challenge in the last few minutes?",
        "How can I help you maintain focus right now?",
      ];

      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

      return {
        prompt: randomPrompt,
        context: promptContext,
        success: true,
      };
    } catch (error) {
      console.error("Prompt generation error:", error);
      return {
        prompt: "How are you doing with your current task?",
        context: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});