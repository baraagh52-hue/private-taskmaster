import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query, QueryCtx, mutation } from "./_generated/server";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

export const updateUserPreferences = mutation({
  args: {
    timezone: v.optional(v.string()),
    preferredVoice: v.optional(v.string()),
    speechRate: v.optional(v.number()),
    speechPitch: v.optional(v.number()),
    speechVolume: v.optional(v.number()),
    prayerRemindersEnabled: v.optional(v.boolean()),
    prayerTimes: v.optional(v.array(v.object({
      name: v.string(),
      time: v.string(),
      enabled: v.boolean()
    }))),
    microsoftClientId: v.optional(v.string()),
    microsoftClientSecret: v.optional(v.string()),
    microsoftTenantId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email!))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      ...args,
    });

    return { success: true };
  },
});