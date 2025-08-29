import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./users";

// Internal function to log AI interactions
export const logInteraction = internalMutation({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("sessions")),
    checkinId: v.optional(v.id("checkins")),
    prompt: v.string(),
    response: v.string(),
    model: v.string(),
    responseTime: v.optional(v.number()),
    tokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiInteractions", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

// Get AI interaction history for a user
export const getUserInteractions = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiInteractions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);
  },
});

// Get current user for internal use
export const getCurrentUserInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});
