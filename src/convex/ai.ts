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
      // Relax auth: allow guest usage
      const user = await ctx.runQuery(api.users.currentUser).catch(() => null);

      // Check if user wants to create a task
      const taskCreationResult = await parseTaskCreationRequest(ctx, args.prompt, args.sessionId);
      
      // Check if user is asking about prayers
      const prayerResponse = await handlePrayerQuery(ctx, args.prompt);

      // Build context-aware prompt for accountability
      const systemPrompt = `You are an AI accountability assistant helping users stay focused and productive. Your role is to:
1. Provide gentle but firm nudges when users are procrastinating
2. Offer specific, actionable advice to get back on track
3. Celebrate progress and maintain motivation
4. Ask follow-up questions to understand the user's current state
5. Keep responses concise and encouraging (2-3 sentences max)
6. Help with prayer reminders and Islamic accountability
7. Create tasks in Microsoft To-Do when requested
8. Provide prayer time reminders and encouragement

Context: ${args.context || "General productivity check-in"}

${taskCreationResult.created ? `✅ I've added "${taskCreationResult.taskTitle}" to your Microsoft To-Do list!` : ''}
${prayerResponse ? `🕌 Prayer reminder: ${prayerResponse}` : ''}

Respond in a supportive, understanding tone while being direct about accountability. If the user mentions prayers or Islamic practices, be encouraging and supportive of their spiritual goals.`;

      // Prepare chat messages for provider-style APIs
      const chatMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: args.prompt },
      ];

      // Provider selection: prefer explicit LLM_PROVIDER, else detect by available keys
      const providerEnv = (process.env.LLM_PROVIDER || "").toLowerCase();
      const hasGroq = !!process.env.GROQ_API_KEY;
      const hasGoogle = !!process.env.GOOGLE_GEMINI_API_KEY;

      let aiResponse = "";
      let usedModel = "phi3:mini";
      let usedProvider = "ollama";

      // Helper: call Groq (OpenAI-compatible)
      const callGroq = async (): Promise<{ text: string; model: string }> => {
        const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: chatMessages,
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 300,
          }),
        });
        if (!resp.ok) {
          throw new Error(`Groq API error: ${resp.status} ${resp.statusText}`);
        }
        const data: any = await resp.json();
        const text = data?.choices?.[0]?.message?.content || "";
        return { text, model };
      };

      // Helper: call Google Gemini
      const callGoogle = async (): Promise<{ text: string; model: string }> => {
        const model = process.env.GOOGLE_GEMINI_MODEL || "gemini-1.5-flash";
        const key = process.env.GOOGLE_GEMINI_API_KEY!;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

        // Concatenate system + user for a simple MVP prompt to Gemini
        const combined = `${systemPrompt}\n\nUser: ${args.prompt}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: combined }] }],
            generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 300 },
          }),
        });
        if (!resp.ok) {
          throw new Error(`Google Gemini API error: ${resp.status} ${resp.statusText}`);
        }
        const data: any = await resp.json();
        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join("\n") ||
          "";
        return { text, model };
      };

      // Try configured provider first
      if (providerEnv === "groq" && hasGroq) {
        const { text, model } = await callGroq();
        aiResponse = text || "";
        usedModel = model;
        usedProvider = "groq";
      } else if (providerEnv === "google" && hasGoogle) {
        const { text, model } = await callGoogle();
        aiResponse = text || "";
        usedModel = model;
        usedProvider = "google";
      } else if (hasGroq) {
        // Auto-detect: prefer Groq if key present
        const { text, model } = await callGroq();
        aiResponse = text || "";
        usedModel = model;
        usedProvider = "groq";
      } else if (hasGoogle) {
        const { text, model } = await callGoogle();
        aiResponse = text || "";
        usedModel = model;
        usedProvider = "google";
      } else {
        // Fallback to local Ollama as before
        const fullPrompt = `${systemPrompt}\n\nUser: ${args.prompt}`;
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
        aiResponse = data.response;
        usedModel = "phi3:mini";
        usedProvider = "ollama";
      }

      // Append task creation confirmation if task was created
      if (taskCreationResult.created) {
        aiResponse = `✅ I've added "${taskCreationResult.taskTitle}" to your Microsoft To-Do list!\n\n${aiResponse}`;
      }

      // Append prayer reminder if relevant
      if (prayerResponse) {
        aiResponse = `🕌 ${prayerResponse}\n\n${aiResponse}`;
      }

      const responseTime = Date.now() - startTime;

      // Log the interaction only if a user exists
      if (user) {
        await ctx.runMutation(internal.aiInternal.logInteraction, {
          userId: user._id,
          sessionId: args.sessionId,
          checkinId: args.checkinId,
          prompt: args.prompt,
          response: aiResponse,
          model: `${usedProvider}:${usedModel}`,
          responseTime,
        });
      }

      return {
        response: aiResponse,
        responseTime,
        success: true,
        taskCreated: taskCreationResult.created,
        taskTitle: taskCreationResult.taskTitle,
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

type ChatResult = {
  response: string;
  responseTime: number;
  success: boolean;
  taskCreated?: boolean;
  taskTitle?: string;
  error?: string;
};

type TaskCreationParseResult = {
  created: boolean;
  taskTitle: string;
  error: string | null;
};

// Parse task creation requests from user input
async function parseTaskCreationRequest(
  ctx: any,
  prompt: string,
  sessionId?: string
): Promise<TaskCreationParseResult> {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for task creation keywords
  const taskKeywords = [
    "add task", "create task", "add to my to-do", "add to todo", "add to my todo",
    "remind me to", "i need to", "add to my list", "create a task"
  ];
  
  const hasTaskKeyword = taskKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  if (hasTaskKeyword) {
    // Extract task title from the prompt
    let taskTitle = "";
    
    if (lowerPrompt.includes("add task")) {
      taskTitle = prompt.substring(prompt.toLowerCase().indexOf("add task") + 8).trim();
    } else if (lowerPrompt.includes("remind me to")) {
      taskTitle = prompt.substring(prompt.toLowerCase().indexOf("remind me to") + 12).trim();
    } else if (lowerPrompt.includes("i need to")) {
      taskTitle = prompt.substring(prompt.toLowerCase().indexOf("i need to") + 9).trim();
    } else if (lowerPrompt.includes("add to my to-do")) {
      taskTitle = prompt.substring(prompt.toLowerCase().indexOf("add to my to-do") + 15).trim();
    } else if (lowerPrompt.includes("create task")) {
      taskTitle = prompt.substring(prompt.toLowerCase().indexOf("create task") + 11).trim();
    }
    
    // Clean up the task title
    taskTitle = taskTitle.replace(/^[:\-\s]+/, '').trim();
    taskTitle = taskTitle.replace(/[.!?]+$/, '').trim();
    
    if (taskTitle && taskTitle.length > 0) {
      try {
        const result = await ctx.runAction((api as any).microsoftTodo.createTask, {
          title: taskTitle,
          description: `Created from AI chat: "${prompt}"`,
          sessionId: sessionId,
        });
        
        return {
          created: result.success,
          taskTitle: taskTitle,
          error: result.error,
        };
      } catch (error) {
        console.error("Error creating task:", error);
        return {
          created: false,
          taskTitle: taskTitle,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }
  }
  
  return { created: false, taskTitle: "", error: null };
}

// Handle prayer-related queries
async function handlePrayerQuery(ctx: any, prompt: string): Promise<string | null> {
  const lowerPrompt = prompt.toLowerCase();
  
  const prayerKeywords = [
    "prayer", "salah", "namaz", "fajr", "dhuhr", "asr", "maghrib", "isha",
    "pray", "praying", "islamic", "muslim", "allah", "dua"
  ];
  
  const hasPrayerKeyword = prayerKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  if (hasPrayerKeyword) {
    try {
      const prayerStatus = await ctx.runQuery(api.prayers.getTodaysPrayerStatus);
      const prayerStats = await ctx.runQuery(api.prayers.getPrayerStats, { days: 7 });
      
      if (prayerStatus && prayerStatus.length > 0) {
        const pendingPrayers = prayerStatus.filter((p: any) => p.status === "pending" && p.enabled);
        const completedToday = prayerStatus.filter((p: any) => p.status === "completed").length;
        
        if (pendingPrayers.length > 0) {
          const nextPrayer = pendingPrayers[0];
          return `Your next prayer is ${nextPrayer.name} at ${nextPrayer.time}. You've completed ${completedToday}/5 prayers today. May Allah make it easy for you! 🤲`;
        } else {
          return `Alhamdulillah! You've completed all your prayers today (${completedToday}/5). Your prayer streak is ${prayerStats?.streak || 0} days! 🌟`;
        }
      }
    } catch (error) {
      console.error("Error handling prayer query:", error);
    }
  }
  
  return null;
}

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
        "Have you remembered your prayers today? How's your spiritual focus?",
        "Any tasks you need me to add to your to-do list?",
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