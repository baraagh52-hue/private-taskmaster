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

export const checkinResponseValidator = v.object({
  text: v.string(),
  status: v.optional(v.string()),
  // extend later as needed
});

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

  },
  {
    schemaValidation: false,
  },
);

export default schema;