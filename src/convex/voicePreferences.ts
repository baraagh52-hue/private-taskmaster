import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserVoicePreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    
    return {
      preferredVoice: user.preferredVoice || null,
      speechRate: user.speechRate || 1,
      speechPitch: user.speechPitch || 1,
      speechVolume: user.speechVolume || 1,
    };
  },
});

export const updateVoicePreferences = mutation({
  args: {
    preferredVoice: v.optional(v.string()),
    speechRate: v.optional(v.number()),
    speechPitch: v.optional(v.number()),
    speechVolume: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }
    
    const updates: any = {};
    if (args.preferredVoice !== undefined) updates.preferredVoice = args.preferredVoice;
    if (args.speechRate !== undefined) updates.speechRate = args.speechRate;
    if (args.speechPitch !== undefined) updates.speechPitch = args.speechPitch;
    if (args.speechVolume !== undefined) updates.speechVolume = args.speechVolume;
    
    await ctx.db.patch(userId, updates);
    
    return { success: true };
  },
});
