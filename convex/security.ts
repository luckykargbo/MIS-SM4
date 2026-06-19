import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ─── GET ACTIVE SESSIONS ─────────────────────────────────────
export const getActiveSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authSessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// ─── TERMINATE SESSION ───────────────────────────────────────
export const terminateSession = mutation({
  args: { sessionId: v.id("authSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found.");
    
    await ctx.db.patch(args.sessionId, { isActive: false });
    
    await ctx.db.insert("securityLogs", {
      userId: session.userId,
      event: "session_terminated",
      details: `Session on ${session.device} (${session.browser}) terminated by user.`,
      ipAddress: session.ipAddress,
      timestamp: Date.now(),
    });
    
    return { success: true };
  },
});

// ─── GET SECURITY LOGS ───────────────────────────────────────
export const getSecurityLogs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("securityLogs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

// ─── GET ALL SECURITY LOGS (ADMIN ONLY) ──────────────────────────
export const listAllSecurityLogs = query({
  args: { requesterId: v.id("users") },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester || requester.role !== "admin") {
      throw new ConvexError("Access Denied: Admin only.");
    }

    const logs = await ctx.db.query("securityLogs").order("desc").take(50);
    const result = [];
    for (const log of logs) {
      const u = await ctx.db.get(log.userId);
      result.push({
        ...log,
        userName: u ? u.name : "Unknown User",
        userEmail: u ? u.email : "N/A",
      });
    }
    return result;
  },
});

// ─── LOG ENTRANCE CHECKIN ─────────────────────────────────────────
export const logEntranceCheckin = mutation({
  args: {
    userId: v.id("users"),
    status: v.union(v.literal("granted"), v.literal("denied")),
    reason: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found.");

    await ctx.db.insert("securityLogs", {
      userId: args.userId,
      event: args.status === "granted" ? "login_success" : "login_failure",
      details: `Entrance Check-in: Access ${args.status.toUpperCase()} - ${args.reason}`,
      ipAddress: args.ipAddress || "127.0.0.1",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─── SCAN STUDENT ENTRANCE (SERVER SIDE SECURITY SCAN) ──────────────────
export const scanStudentEntrance = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester || requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Admins can run entrance scans.");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new ConvexError("Student not found.");

    // Retrieve tuition balance directly from Convex db context
    const financeRecord = await ctx.db
      .query("finance")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .first();

    let status: "granted" | "denied" = "granted";
    let reason = "Active enrollment, tuition balance cleared.";

    if (student.registryStatus !== "active") {
      status = "denied";
      reason = `Registry Alert: Student registration status is '${student.registryStatus.toUpperCase()}'.`;
    } else if (financeRecord && financeRecord.balance > 0) {
      status = "denied";
      reason = `Financial Alert: Outstanding tuition balance of SLE ${financeRecord.balance.toLocaleString()}.`;
    }

    // Insert security log
    await ctx.db.insert("securityLogs", {
      userId: student.userId,
      event: status === "granted" ? "login_success" : "login_failure",
      details: `Entrance Check-in: Access ${status.toUpperCase()} - ${reason}`,
      ipAddress: args.ipAddress || "127.0.0.1",
      timestamp: Date.now(),
    });

    return { status, reason };
  },
});

