import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Verify user is valid
async function verifyUser(ctx: any, userId: any, allowedRoles?: string[]) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Access Denied: User not found");
  }
  if (user.isBlocked) {
    throw new Error("Access Denied: Account is deactivated");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("Access Denied: Insufficient permissions");
  }
  return user;
}

export const applyForTranscript = mutation({
  args: {
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.requesterId, ["student"]);

    // Find student document
    const student = await ctx.db
      .query("students")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!student) {
      throw new Error("Student record not found");
    }

    // Check for existing pending transcript request
    const existing = await ctx.db
      .query("transcriptApplications")
      .withIndex("by_studentId", (q) => q.eq("studentId", student._id))
      .collect();

    const hasPending = existing.some(
      (app) => app.status === "Pending_Finance" || app.status === "Pending_Registry"
    );

    if (hasPending) {
      throw new Error("You already have an active transcript application pending approval.");
    }

    // Insert transcript application
    const appId = await ctx.db.insert("transcriptApplications", {
      studentId: student._id,
      studentName: student.name,
      rollNumber: student.rollNumber,
      program: student.program,
      semester: student.semester,
      status: "Pending_Finance",
      createdAt: Date.now(),
    });

    return appId;
  },
});

export const getStudentApplications = query({
  args: {
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await verifyUser(ctx, args.requesterId, ["student"]);

    const student = await ctx.db
      .query("students")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!student) {
      return [];
    }

    return await ctx.db
      .query("transcriptApplications")
      .withIndex("by_studentId", (q) => q.eq("studentId", student._id))
      .order("desc")
      .collect();
  },
});

export const listTranscriptApplications = query({
  args: {
    requesterId: v.id("users"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.requesterId, ["admin", "finance", "registry"]);

    if (args.status) {
      return await ctx.db
        .query("transcriptApplications")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    }

    return await ctx.db.query("transcriptApplications").order("desc").collect();
  },
});

export const approveTranscriptFinance = mutation({
  args: {
    requesterId: v.id("users"),
    applicationId: v.id("transcriptApplications"),
  },
  handler: async (ctx, args) => {
    const approver = await verifyUser(ctx, args.requesterId, ["finance", "admin"]);

    const app = await ctx.db.get(args.applicationId);
    if (!app) {
      throw new Error("Transcript application not found");
    }
    if (app.status !== "Pending_Finance") {
      throw new Error("Application is not pending finance clearance");
    }

    // Generate unique verification code
    const randPart1 = Math.floor(1000 + Math.random() * 9000);
    const randPart2 = Math.floor(1000 + Math.random() * 9000);
    const verificationCode = `LUSL-TR-${randPart1}-${randPart2}`;

    await ctx.db.patch(args.applicationId, {
      status: "Pending_Registry",
      verificationCode,
      financeApprovedAt: Date.now(),
      financeApproverName: approver.name,
    });

    // Fetch the target student user account to notify
    const studentDoc = await ctx.db.get(app.studentId);
    if (studentDoc) {
      await ctx.db.insert("notifications", {
        userId: studentDoc.userId,
        fromUserId: approver._id,
        title: "Transcript Cleared by Finance",
        message: `Your transcript request has been cleared by Finance. Use code ${verificationCode} at Registry to collect it.`,
        isReadBy: [],
        createdAt: Date.now(),
      });
    }

    return verificationCode;
  },
});

export const rejectTranscriptFinance = mutation({
  args: {
    requesterId: v.id("users"),
    applicationId: v.id("transcriptApplications"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const approver = await verifyUser(ctx, args.requesterId, ["finance", "admin"]);

    const app = await ctx.db.get(args.applicationId);
    if (!app) {
      throw new Error("Transcript application not found");
    }
    if (app.status !== "Pending_Finance") {
      throw new Error("Application is not pending finance clearance");
    }

    await ctx.db.patch(args.applicationId, {
      status: "Rejected",
      rejectionReason: args.reason,
    });

    // Notify student
    const studentDoc = await ctx.db.get(app.studentId);
    if (studentDoc) {
      await ctx.db.insert("notifications", {
        userId: studentDoc.userId,
        fromUserId: approver._id,
        title: "Transcript Application Rejected",
        message: `Your transcript request was rejected by Finance. Reason: ${args.reason}`,
        isReadBy: [],
        createdAt: Date.now(),
      });
    }

    return true;
  },
});

export const verifyTranscriptCode = query({
  args: {
    requesterId: v.id("users"),
    verificationCode: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyUser(ctx, args.requesterId, ["registry", "admin"]);

    const code = args.verificationCode.trim();
    const app = await ctx.db
      .query("transcriptApplications")
      .withIndex("by_verificationCode", (q) => q.eq("verificationCode", code))
      .first();

    if (!app) {
      return null;
    }

    // Get student details to show registry
    const student = await ctx.db.get(app.studentId);
    return {
      application: app,
      student,
    };
  },
});

export const collectTranscript = mutation({
  args: {
    requesterId: v.id("users"),
    applicationId: v.id("transcriptApplications"),
  },
  handler: async (ctx, args) => {
    const actor = await verifyUser(ctx, args.requesterId, ["registry", "admin"]);

    const app = await ctx.db.get(args.applicationId);
    if (!app) {
      throw new Error("Transcript application not found");
    }
    if (app.status !== "Pending_Registry") {
      throw new Error("Application is not cleared or already collected");
    }

    await ctx.db.patch(args.applicationId, {
      status: "Collected",
      registryDispatchedAt: Date.now(),
    });

    // Write academic registry audit log
    await ctx.db.insert("academicAuditLogs", {
      actorId: actor._id,
      studentId: app.studentId,
      action: "transcript_status_change",
      details: `Handed over physical academic transcript. Cleared by Finance: ${app.financeApproverName || "System"}. Verification Code: ${app.verificationCode}`,
      timestamp: Date.now(),
    });

    // Notify student of collection
    const studentDoc = await ctx.db.get(app.studentId);
    if (studentDoc) {
      await ctx.db.insert("notifications", {
        userId: studentDoc.userId,
        fromUserId: actor._id,
        title: "Transcript Handed Over",
        message: `Your physical academic transcript has been successfully collected from the Registry counter.`,
        isReadBy: [],
        createdAt: Date.now(),
      });
    }

    return true;
  },
});
