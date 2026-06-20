import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api } from "./_generated/api";

// ─── PORTAL SETTINGS ──────────────────────────────────────────

export const getPortalStatus = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("admissionsSettings").first();
    if (!settings) return { isOpen: false };
    return settings;
  },
});

export const togglePortalStatus = mutation({
  args: {
    requesterId: v.string(),
    isOpen: v.boolean(),
  },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || (requester.role !== "admin" && requester.role !== "registry")) {
      throw new ConvexError("Access Denied: Only Admin and Registry can toggle the Admissions Portal.");
    }

    const settings = await ctx.db.query("admissionsSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        isOpen: args.isOpen,
        lastUpdatedBy: reqId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("admissionsSettings", {
        isOpen: args.isOpen,
        lastUpdatedBy: reqId,
        updatedAt: Date.now(),
      });
    }
  },
});

// ─── APPLICATIONS LOGIC ───────────────────────────────────────

export const submitApplication = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    program: v.string(),
    faculty: v.string(),
    wassceGrades: v.array(
      v.object({
        subject: v.string(),
        grade: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("admissionsSettings").first();
    if (!settings || !settings.isOpen) {
      throw new ConvexError("Admissions are currently closed. We are not accepting applications at this time.");
    }

    const normalizedEmail = args.email.trim().toLowerCase();
    
    // Prevent duplicate applications
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing && existing.status !== "rejected") {
      throw new ConvexError("An application with this email already exists and is either pending or approved.");
    }

    await ctx.db.insert("applications", {
      ...args,
      email: normalizedEmail,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const listApplications = query({
  args: {
    requesterId: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) return [];

    const requester = await ctx.db.get(reqId);
    if (!requester || (requester.role !== "admin" && requester.role !== "registry")) {
      return [];
    }

    let query = ctx.db.query("applications").order("desc");
    if (args.status) {
      query = ctx.db.query("applications").withIndex("by_status", (q) => q.eq("status", args.status as any)).order("desc");
    }

    return await query.collect();
  },
});

export const reviewApplication = mutation({
  args: {
    requesterId: v.string(),
    applicationId: v.id("applications"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || (requester.role !== "admin" && requester.role !== "registry")) {
      throw new ConvexError("Access Denied: Only Admin and Registry can review applications.");
    }

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new ConvexError("Application not found.");

    // Generate a secure verification code if approved
    let verificationCode = undefined;
    if (args.status === "approved") {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars like I, O, 0, 1
      let code = "LUSL-";
      for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      verificationCode = code;
    }

    await ctx.db.patch(args.applicationId, {
      status: args.status,
      reviewedBy: reqId,
      verificationCode,
    });

    // Fetch the updated application to return it
    const updatedApplication = await ctx.db.get(args.applicationId);

    if (args.status === "approved" && updatedApplication) {
      return { success: true, application: updatedApplication };
    }

    return { success: true };
  },
});

// ─── APPLICANT PUBLIC STATUS QUERY ────────────────────────────

export const checkApplicationStatus = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .order("desc")
      .first();

    if (!existing) return { found: false };
    return { found: true, application: existing };
  },
});

// ─── REGISTRY PHYSICAL VERIFICATION ───────────────────────────

export const verifyAcceptanceLetter = mutation({
  args: {
    requesterId: v.string(),
    verificationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || (requester.role !== "admin" && requester.role !== "registry")) {
      throw new ConvexError("Access Denied.");
    }

    // Find application by verification code
    const applications = await ctx.db.query("applications").collect();
    const app = applications.find(a => a.verificationCode === args.verificationCode);
    
    if (!app) throw new ConvexError("Invalid Verification Code. This letter is not authentic.");
    if (app.status !== "approved") throw new ConvexError("This application is not approved.");

    // Find the provisioned student record by matching email to user, then to student
    // This assumes the user was provisioned with the application's email
    const user = await ctx.db.query("users").withIndex("by_email", q => q.eq("email", app.email)).first();
    if (!user) throw new ConvexError("Student user account not found. Provisioning may have failed.");

    const student = await ctx.db.query("students").withIndex("by_userId", q => q.eq("userId", user._id)).first();
    if (!student) throw new ConvexError("Student academic record not found.");

    if (student.isPhysicallyVerified) {
      throw new ConvexError("This student has already been physically verified.");
    }

    await ctx.db.patch(student._id, {
      isPhysicallyVerified: true,
    });

    return { success: true, studentName: `${app.firstName} ${app.lastName}`, rollNumber: student.rollNumber };
  },
});
