/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as aiInternal from "../aiInternal.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth from "../auth.js";
import type * as checkins from "../checkins.js";
import type * as http from "../http.js";
import type * as sessions from "../sessions.js";
import type * as users from "../users.js";
import type * as voice from "../voice.js";
import type * as voicePreferences from "../voicePreferences.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiInternal: typeof aiInternal;
  "auth/emailOtp": typeof auth_emailOtp;
  auth: typeof auth;
  checkins: typeof checkins;
  http: typeof http;
  sessions: typeof sessions;
  users: typeof users;
  voice: typeof voice;
  voicePreferences: typeof voicePreferences;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
