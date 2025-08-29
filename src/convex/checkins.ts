import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { checkinResponseValidator } from "./schema";

// Create a new check-in
export const createCheckin = mutation({
  args: {
    sessionId: v.id("sessions"),
    response: checkinResponseValidator,
    description: v.optional(v.string()),
    aiPrompt: v.optional(v.string()),
    aiResponse: v.optional(v.string()),
    voiceInput: v.optional(v.boolean()),
    voiceOutput: v.optional(v.boolean()),
    mood: v.optional(v.number()),
    focus: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    // Verify session belongs to user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    const checkinId = await ctx.db.insert("checkins", {
      ...args,
      userId: user._id,
      timestamp: Date.now(),
    });

    return checkinId;
  },
});

// Get check-ins for a session
export const getSessionCheckins = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Verify session belongs to user
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      return [];
    }

    return await ctx.db
      .query("checkins")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

// Update user preferences
export const updateUserPreferences = mutation({
  args: {
    checkinFrequency: v.optional(v.number()),
    voiceEnabled: v.optional(v.boolean()),
    preferredVoice: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    await ctx.db.patch(user._id, args);
    return user._id;
  },
});
