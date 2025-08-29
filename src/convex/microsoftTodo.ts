"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Microsoft Graph API endpoints
const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

// Get access token for Microsoft Graph API
async function getAccessToken(clientId: string, clientSecret: string, tenantId: string) {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Create a task in Microsoft To-Do
export const createTask: any = action({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("normal"), v.literal("high"))),
    sessionId: v.optional(v.id("sessions")),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    taskId?: Id<"todoTasks">;
    microsoftTaskId?: string;
    title?: string;
    error?: string;
  }> => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // Get environment variables (prefer user-saved values from Settings)
      const clientId = (user as any)?.microsoftClientId ?? process.env.GRAPH_CLIENT_ID;
      const clientSecret = (user as any)?.microsoftClientSecret ?? process.env.GRAPH_CLIENT_SECRET;
      const tenantId = (user as any)?.microsoftTenantId ?? process.env.GRAPH_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("Microsoft Graph credentials not configured");
      }

      // Get access token
      const accessToken = await getAccessToken(clientId, clientSecret, tenantId);

      // Create task in Microsoft To-Do
      const taskData = {
        title: args.title,
        body: {
          content: args.description || "",
          contentType: "text"
        },
        importance: args.priority === "high" ? "high" : args.priority === "low" ? "low" : "normal",
        ...(args.dueDate && {
          dueDateTime: {
            dateTime: new Date(args.dueDate).toISOString(),
            timeZone: "UTC"
          }
        })
      };

      // First, get the default task list
      const listsResponse = await fetch(`${GRAPH_BASE_URL}/me/todo/lists`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!listsResponse.ok) {
        throw new Error(`Failed to get task lists: ${listsResponse.statusText}`);
      }

      const listsData = await listsResponse.json();
      const defaultList = listsData.value.find((list: any) => list.wellknownListName === "defaultList") || listsData.value[0];

      if (!defaultList) {
        throw new Error("No task list found");
      }

      // Create the task
      const taskResponse = await fetch(`${GRAPH_BASE_URL}/me/todo/lists/${defaultList.id}/tasks`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      if (!taskResponse.ok) {
        throw new Error(`Failed to create task: ${taskResponse.statusText}`);
      }

      const createdTask = await taskResponse.json();

      // Store task in local database
      const localTaskId = await ctx.runMutation(internal.microsoftTodoInternal.createLocalTask, {
        userId: user._id,
        microsoftTaskId: createdTask.id,
        title: args.title,
        description: args.description,
        status: "notStarted",
        priority: args.priority,
        dueDate: args.dueDate,
        createdFromAI: true,
        sessionId: args.sessionId,
      });

      return {
        success: true,
        taskId: localTaskId,
        microsoftTaskId: createdTask.id,
        title: args.title,
      };
    } catch (error) {
      console.error("Error creating Microsoft To-Do task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// List tasks from Microsoft To-Do
export const listTasks: any = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    success: boolean;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      importance: string;
      createdDateTime: string;
      dueDateTime?: string;
    }>;
    error?: string;
  }> => {
    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const clientId = (user as any)?.microsoftClientId ?? process.env.GRAPH_CLIENT_ID;
      const clientSecret = (user as any)?.microsoftClientSecret ?? process.env.GRAPH_CLIENT_SECRET;
      const tenantId = (user as any)?.microsoftTenantId ?? process.env.GRAPH_TENANT_ID;

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error("Microsoft Graph credentials not configured");
      }

      const accessToken = await getAccessToken(clientId, clientSecret, tenantId);

      // Get task lists
      const listsResponse = await fetch(`${GRAPH_BASE_URL}/me/todo/lists`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!listsResponse.ok) {
        throw new Error(`Failed to get task lists: ${listsResponse.statusText}`);
      }

      const listsData = await listsResponse.json();
      const defaultList = listsData.value.find((list: any) => list.wellknownListName === "defaultList") || listsData.value[0];

      if (!defaultList) {
        return { success: true, tasks: [] };
      }

      // Get tasks from default list
      const tasksResponse = await fetch(`${GRAPH_BASE_URL}/me/todo/lists/${defaultList.id}/tasks`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!tasksResponse.ok) {
        throw new Error(`Failed to get tasks: ${tasksResponse.statusText}`);
      }

      const tasksData = await tasksResponse.json();

      return {
        success: true,
        tasks: tasksData.value.map((task: any) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          importance: task.importance,
          createdDateTime: task.createdDateTime,
          dueDateTime: task.dueDateTime?.dateTime,
        })),
      };
    } catch (error) {
      console.error("Error listing Microsoft To-Do tasks:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        tasks: [],
      };
    }
  },
});