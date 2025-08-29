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

// Session status types
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
export type SessionStatus = Infer<typeof sessionStatusValidator>;

// Check-in response types
export const CHECKIN_RESPONSE = {
  ON_TASK: "on_task",
  DISTRACTED: "distracted",
  PROCRASTINATING: "procrastinating",
  BREAK: "break",
} as const;

export const checkinResponseValidator = v.union(
  v.literal(CHECKIN_RESPONSE.ON_TASK),
  v.literal(CHECKIN_RESPONSE.DISTRACTED),
  v.literal(CHECKIN_RESPONSE.PROCRASTINATING),
  v.literal(CHECKIN_RESPONSE.BREAK),
);
export type CheckinResponse = Infer<typeof checkinResponseValidator>;

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
      
      // User preferences for accountability assistant
      checkinFrequency: v.optional(v.number()), // minutes between check-ins (default: 25)
      voiceEnabled: v.optional(v.boolean()), // enable TTS/STT
      preferredVoice: v.optional(v.string()), // voice ID for TTS
      timezone: v.optional(v.string()), // user timezone
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Sessions table - tracks work sessions
    sessions: defineTable({
      userId: v.id("users"),
      title: v.string(), // session title/goal
      description: v.optional(v.string()), // detailed description of tasks
      tasks: v.array(v.string()), // list of specific tasks to accomplish
      status: sessionStatusValidator,
      startTime: v.number(), // timestamp when session started
      endTime: v.optional(v.number()), // timestamp when session ended
      plannedDuration: v.number(), // planned duration in minutes
      actualDuration: v.optional(v.number()), // actual duration in minutes
      productivity: v.optional(v.number()), // productivity score 1-10
      notes: v.optional(v.string()), // session summary notes
    })
      .index("by_user", ["userId"])
      .index("by_user_and_status", ["userId", "status"])
      .index("by_start_time", ["startTime"]),

    // Check-ins table - periodic accountability check-ins
    checkins: defineTable({
      sessionId: v.id("sessions"),
      userId: v.id("users"),
      timestamp: v.number(),
      response: checkinResponseValidator, // what user was doing
      description: v.optional(v.string()), // user's description of current activity
      aiPrompt: v.optional(v.string()), // AI's prompt/question
      aiResponse: v.optional(v.string()), // AI's feedback/nudge
      voiceInput: v.optional(v.boolean()), // was input via voice
      voiceOutput: v.optional(v.boolean()), // was output via voice
      mood: v.optional(v.number()), // user mood 1-10
      focus: v.optional(v.number()), // focus level 1-10
    })
      .index("by_session", ["sessionId"])
      .index("by_user", ["userId"])
      .index("by_timestamp", ["timestamp"]),

    // AI interactions log
    aiInteractions: defineTable({
      userId: v.id("users"),
      sessionId: v.optional(v.id("sessions")),
      checkinId: v.optional(v.id("checkins")),
      prompt: v.string(), // user input or system prompt
      response: v.string(), // AI response
      model: v.string(), // AI model used (e.g., "phi-3-mini")
      timestamp: v.number(),
      responseTime: v.optional(v.number()), // response time in ms
      tokens: v.optional(v.number()), // token count if available
    })
      .index("by_user", ["userId"])
      .index("by_session", ["sessionId"])
      .index("by_timestamp", ["timestamp"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;