import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const createLocalTask = internalMutation({
  args: {
    userId: v.id("users"),
    microsoftTaskId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("notStarted"), v.literal("inProgress"), v.literal("completed")),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    dueDate: v.optional(v.number()),
    createdFromAI: v.optional(v.boolean()),
    sessionId: v.optional(v.id("sessions")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todoTasks", {
      ...args,
      lastSynced: Date.now(),
    });
  },
});

export const getUserTasks = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todoTasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
