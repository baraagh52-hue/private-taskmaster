import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./users";
import { SESSION_STATUS, sessionStatusValidator } from "./schema";

// Create a new accountability session
export const createSession = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    tasks: v.array(v.string()),
    plannedDuration: v.number(), // in minutes
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated to create a session");
    }

    // End any existing active sessions
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", user._id).eq("status", SESSION_STATUS.ACTIVE)
      )
      .collect();

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, {
        status: SESSION_STATUS.ABANDONED,
        endTime: Date.now(),
        actualDuration: Math.round((Date.now() - session.startTime) / (1000 * 60)),
      });
    }

    // Create new session
    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      title: args.title,
      description: args.description,
      tasks: args.tasks,
      status: SESSION_STATUS.ACTIVE,
      startTime: Date.now(),
      plannedDuration: args.plannedDuration,
    });

    return sessionId;
  },
});

// Get current active session for user
export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const activeSession = await ctx.db
      .query("sessions")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", user._id).eq("status", SESSION_STATUS.ACTIVE)
      )
      .first();

    return activeSession;
  },
});

// Update session status
export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("sessions"),
    status: sessionStatusValidator,
    productivity: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Session not found or access denied");
    }

    const updates: any = {
      status: args.status,
    };

    if (args.status === SESSION_STATUS.COMPLETED || args.status === SESSION_STATUS.ABANDONED) {
      updates.endTime = Date.now();
      updates.actualDuration = Math.round((Date.now() - session.startTime) / (1000 * 60));
    }

    if (args.productivity !== undefined) {
      updates.productivity = args.productivity;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    await ctx.db.patch(args.sessionId, updates);
    return args.sessionId;
  },
});

// Get user's session history
export const getUserSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 20);
  },
});

// Internal function to get session by ID
export const getSession = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Get session statistics
export const getSessionStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completedSessions = sessions.filter(s => s.status === SESSION_STATUS.COMPLETED);
    const totalSessions = sessions.length;
    const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
    const avgProductivity = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + (s.productivity || 0), 0) / completedSessions.length
      : 0;

    return {
      totalSessions,
      completedSessions: completedSessions.length,
      totalMinutes,
      avgProductivity: Math.round(avgProductivity * 10) / 10,
      completionRate: totalSessions > 0 ? Math.round((completedSessions.length / totalSessions) * 100) : 0,
    };
  },
});
