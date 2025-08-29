import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getCurrentUser } from "./users";

// Default prayer times (fallback if location-based calculation fails)
const DEFAULT_PRAYER_TIMES = [
  { name: "Fajr", time: "05:30", enabled: true },
  { name: "Dhuhr", time: "12:30", enabled: true },
  { name: "Asr", time: "15:30", enabled: true },
  { name: "Maghrib", time: "18:00", enabled: true },
  { name: "Isha", time: "19:30", enabled: true },
];

// Calculate prayer times based on location using Aladhan API
export const calculatePrayerTimes = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
    method: v.optional(v.number()), // Calculation method (default: 2 for ISNA)
  },
  handler: async (ctx, args) => {
    try {
      const { latitude, longitude, method = 2 } = args;
      const today = new Date();
      const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
      
      const response = await fetch(
        `http://api.aladhan.com/v1/timings/${dateStr}?latitude=${latitude}&longitude=${longitude}&method=${method}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch prayer times");
      }
      
      const data = await response.json();
      const timings = data.data.timings;
      
      // Convert 24-hour format to HH:MM and create prayer times array
      const prayerTimes = [
        { name: "Fajr", time: formatTime(timings.Fajr), enabled: true },
        { name: "Dhuhr", time: formatTime(timings.Dhuhr), enabled: true },
        { name: "Asr", time: formatTime(timings.Asr), enabled: true },
        { name: "Maghrib", time: formatTime(timings.Maghrib), enabled: true },
        { name: "Isha", time: formatTime(timings.Isha), enabled: true },
      ];
      
      return {
        success: true,
        prayerTimes,
        location: { latitude, longitude },
        date: dateStr,
        timezone: data.data.meta.timezone,
      };
    } catch (error) {
      console.error("Prayer time calculation error:", error);
      // Fix: 'error' is unknown, ensure we convert to string safely
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: message,
        prayerTimes: DEFAULT_PRAYER_TIMES,
      };
    }
  },
});

// Helper function to format time from API response
function formatTime(timeString: string): string {
  // Remove timezone info and convert to HH:MM format
  const time = timeString.split(' ')[0];
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

// Update user prayer preferences
export const updatePrayerPreferences = mutation({
  args: {
    prayerRemindersEnabled: v.optional(v.boolean()),
    prayerTimes: v.optional(v.array(v.object({
      name: v.string(),
      time: v.string(),
      enabled: v.boolean()
    }))),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    await ctx.db.patch(user._id, {
      prayerRemindersEnabled: args.prayerRemindersEnabled,
      prayerTimes: args.prayerTimes || DEFAULT_PRAYER_TIMES,
      timezone: args.timezone,
    });

    return user._id;
  },
});

// Get user prayer preferences
export const getPrayerPreferences = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    return {
      prayerRemindersEnabled: user.prayerRemindersEnabled ?? true,
      prayerTimes: user.prayerTimes ?? DEFAULT_PRAYER_TIMES,
      timezone: user.timezone ?? "UTC",
    };
  },
});

// Record prayer check-in
export const recordPrayerCheckin = mutation({
  args: {
    prayerName: v.string(),
    scheduledTime: v.string(),
    status: v.union(v.literal("completed"), v.literal("missed")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User must be authenticated");
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Check if prayer already recorded for today
    const existingCheckin = await ctx.db
      .query("prayerCheckins")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", user._id).eq("date", today)
      )
      .filter((q) => q.eq(q.field("prayerName"), args.prayerName))
      .first();

    if (existingCheckin) {
      // Update existing check-in
      await ctx.db.patch(existingCheckin._id, {
        status: args.status,
        actualTime: args.status === "completed" ? Date.now() : undefined,
        notes: args.notes,
      });
      return existingCheckin._id;
    } else {
      // Create new check-in
      return await ctx.db.insert("prayerCheckins", {
        userId: user._id,
        prayerName: args.prayerName,
        scheduledTime: args.scheduledTime,
        actualTime: args.status === "completed" ? Date.now() : undefined,
        status: args.status,
        date: today,
        notes: args.notes,
      });
    }
  },
});

// Get today's prayer status
export const getTodaysPrayerStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];

    const checkins = await ctx.db
      .query("prayerCheckins")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", user._id).eq("date", today)
      )
      .collect();

    const prayerTimes = user.prayerTimes ?? DEFAULT_PRAYER_TIMES;

    return prayerTimes.map(prayer => {
      const checkin = checkins.find(c => c.prayerName === prayer.name);
      return {
        ...prayer,
        status: checkin?.status ?? "pending",
        actualTime: checkin?.actualTime,
        notes: checkin?.notes,
      };
    });
  },
});

// Get prayer statistics
export const getPrayerStats = query({
  args: {
    days: v.optional(v.number()), // Number of days to look back
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const daysBack = args.days ?? 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    const checkins = await ctx.db
      .query("prayerCheckins")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
      .filter((q) => q.gte(q.field("date"), startDateStr))
      .collect();

    const totalPrayers = daysBack * 5; // 5 prayers per day
    const completedPrayers = checkins.filter(c => c.status === "completed").length;
    const missedPrayers = checkins.filter(c => c.status === "missed").length;

    return {
      totalPrayers,
      completedPrayers,
      missedPrayers,
      completionRate: totalPrayers > 0 ? Math.round((completedPrayers / totalPrayers) * 100) : 0,
      streak: calculatePrayerStreak(checkins),
    };
  },
});

function calculatePrayerStreak(checkins: any[]): number {
  // Simple streak calculation - consecutive days with at least 3 prayers completed
  const dayGroups = checkins.reduce((acc, checkin) => {
    if (!acc[checkin.date]) acc[checkin.date] = [];
    acc[checkin.date].push(checkin);
    return acc;
  }, {} as Record<string, any[]>);

  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 30; i++) { // Check last 30 days
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const dayCheckins = dayGroups[dateStr] || [];
    const completedCount = dayCheckins.filter((c: any) => c.status === "completed").length;
    
    if (completedCount >= 3) { // At least 3 prayers completed
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}