
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// DANGER ZONE: Wipe every row from the `users` table.
// Run this ONCE from the Convex Dashboard → Functions panel.
// ─────────────────────────────────────────────────────────────────
export const clearAllUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    let deleted = 0;
    for (const user of allUsers) {
      await ctx.db.delete(user._id);
      deleted++;
    }
    return { deleted, message: `Deleted ${deleted} user(s). Table is now empty.` };
  },
});

// ─────────────────────────────────────────────────────────────────
// Seed a fresh Admin account.
// Call this AFTER clearAllUsers with the new admin details.
// ─────────────────────────────────────────────────────────────────
export const seedNewAdmin = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(), // SHA-256 hex of the password
  },
  handler: async (ctx, args) => {
    // Guard: don't double-seed
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { passwordHash: args.passwordHash });
      return { status: "updated", email: existing.email };
    }

    const id = await ctx.db.insert("users", {
      name: args.name,
      email: args.email.trim().toLowerCase(),
      passwordHash: args.passwordHash,
      role: "admin",
      isActive: true,
      failedOtpAttempts: 0,
    });

    return { status: "created", userId: id, email: args.email.trim().toLowerCase() };
  },
});

export const removeByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { status: "deleted", email: existing.email };
    }
    return { status: "not_found" };
  }
});
