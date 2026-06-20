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

    await ctx.db.patch(args.applicationId, {
      status: args.status,
      reviewedBy: reqId,
    });

    // If approved, return the application data so frontend can create the user
    if (args.status === "approved") {
      return { success: true, application };
    }

    return { success: true };
  },
});
