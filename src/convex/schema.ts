import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const SESSION_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  ABANDONED: "abandoned",
} as const;

export const sessionStatusValidator = v.union(
  v.literal(SESSION_STATUS.ACTIVE),
  v.literal(SESSION_STATUS.PAUSED),
  v.literal(SESSION_STATUS.COMPLETED),
  v.literal(SESSION_STATUS.ABANDONED),
);

export const checkinResponseValidator = v.union(
  v.literal("progress"),
  v.literal("stuck"),
  v.literal("done"),
  v.literal("other"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      
      // TTS preferences
      preferredVoice: v.optional(v.string()), // preferred voice name for TTS
      speechRate: v.optional(v.number()), // speech rate (0.1 to 10)
      speechPitch: v.optional(v.number()), // speech pitch (0 to 2)
      speechVolume: v.optional(v.number()), // speech volume (0 to 1)
      
      // Prayer preferences
      prayerRemindersEnabled: v.optional(v.boolean()),
      prayerTimes: v.optional(v.array(v.object({
        name: v.string(), // e.g., "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"
        time: v.string(), // e.g., "05:30"
        enabled: v.boolean()
      }))),
      timezone: v.optional(v.string()),
      
      // Microsoft To-Do integration
      microsoftAccessToken: v.optional(v.string()),
      microsoftRefreshToken: v.optional(v.string()),
      microsoftTokenExpiry: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here
    sessions: defineTable({
      userId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      tasks: v.array(v.string()),
      status: sessionStatusValidator,
      startTime: v.number(),
      plannedDuration: v.number(),
      endTime: v.optional(v.number()),
      actualDuration: v.optional(v.number()),
      productivity: v.optional(v.number()),
      notes: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_status", ["userId", "status"]),

    checkins: defineTable({
      sessionId: v.id("sessions"),
      response: checkinResponseValidator,
      description: v.optional(v.string()),
      aiPrompt: v.optional(v.string()),
      aiResponse: v.optional(v.string()),
      voiceInput: v.optional(v.boolean()),
      voiceOutput: v.optional(v.boolean()),
      mood: v.optional(v.number()),
      focus: v.optional(v.number()),
      userId: v.id("users"),
      timestamp: v.number(),
    })
      .index("by_session", ["sessionId"])
      .index("by_user", ["userId"]),

    aiInteractions: defineTable({
      userId: v.id("users"),
      sessionId: v.optional(v.id("sessions")),
      checkinId: v.optional(v.id("checkins")),
      prompt: v.string(),
      response: v.string(),
      model: v.string(),
      responseTime: v.optional(v.number()),
      tokens: v.optional(v.number()),
      timestamp: v.number(),
    }).index("by_user", ["userId"]),

    // Prayer tracking
    prayerCheckins: defineTable({
      userId: v.id("users"),
      prayerName: v.string(), // "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"
      scheduledTime: v.string(), // "05:30"
      actualTime: v.optional(v.number()), // timestamp when prayer was completed
      status: v.union(v.literal("completed"), v.literal("missed"), v.literal("pending")),
      date: v.string(), // "2024-01-15" for tracking daily prayers
      notes: v.optional(v.string()),
    })
      .index("by_user_and_date", ["userId", "date"])
      .index("by_user_and_prayer", ["userId", "prayerName"]),

    // Microsoft To-Do tasks sync
    todoTasks: defineTable({
      userId: v.id("users"),
      microsoftTaskId: v.optional(v.string()), // ID from Microsoft Graph API
      title: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal("notStarted"), v.literal("inProgress"), v.literal("completed")),
      priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
      dueDate: v.optional(v.number()),
      createdFromAI: v.optional(v.boolean()), // Track if task was created via AI
      sessionId: v.optional(v.id("sessions")), // Link to session if created during session
      lastSynced: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_status", ["userId", "status"]),

  },
  {
    schemaValidation: false,
  },
);

export default schema;