import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Get active academic calendar configuration or create a default one
export const getAcademicSettings = query({
  args: {},
  handler: async (ctx) => {
    const record = await ctx.db.query("academicSettings").first();
    if (!record) {
      // Return a default settings block if none provisioned yet
      return {
        reopeningDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 2 weeks from now
        registrationDeadline: Date.now() + 28 * 24 * 60 * 60 * 1000, // 4 weeks from now
        currentAcademicYear: "2025/2026",
        currentSemester: 1,
        isRegistrationOpen: true,
        updatedAt: Date.now(),
      };
    }
    return record;
  },
});

// Update settings block (Registry staff and Admin only)
export const updateAcademicSettings = mutation({
  args: {
    requesterId: v.id("users"),
    reopeningDate: v.number(),
    registrationDeadline: v.number(),
    currentAcademicYear: v.string(),
    currentSemester: v.number(),
    isRegistrationOpen: v.boolean(),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");
    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Registry staff or Admins can change academic dates.");
    }

    const existing = await ctx.db.query("academicSettings").first();
    const data = {
      reopeningDate: args.reopeningDate,
      registrationDeadline: args.registrationDeadline,
      currentAcademicYear: args.currentAcademicYear.trim(),
      currentSemester: args.currentSemester,
      isRegistrationOpen: args.isRegistrationOpen,
      lastUpdatedBy: args.requesterId,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
    } else {
      await ctx.db.insert("academicSettings", data);
    }

    return { success: true };
  },
});
