import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const sendNotification = mutation({
  args: {
    requesterId: v.string(),
    targetUserId: v.union(v.id("users"), v.literal("all")),
    title: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester session ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Administrators can send system notifications.");
    }

    const newNotificationId = await ctx.db.insert("notifications", {
      userId: args.targetUserId,
      fromUserId: reqId,
      title: args.title,
      message: args.message,
      isReadBy: [],
      createdAt: Date.now(),
    });

    return newNotificationId;
  },
});

export const getMyNotifications = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const uid = ctx.db.normalizeId("users", args.userId);
    if (!uid) return [];

    const user = await ctx.db.get(uid);
    if (!user) return [];

    // Retrieve notifications sent to this specific user, or sent to "all"
    const targeted = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", uid))
      .collect();

    const broadcast = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", "all"))
      .collect();

    // Combine them, sort descending by createdAt
    const all = [...targeted, ...broadcast].sort((a, b) => b.createdAt - a.createdAt);

    return all.map((n) => ({
      ...n,
      isRead: n.isReadBy.includes(uid),
    }));
  },
});

export const markAsRead = mutation({
  args: { userId: v.string(), notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const uid = ctx.db.normalizeId("users", args.userId);
    if (!uid) throw new ConvexError("Invalid user ID.");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) throw new ConvexError("Notification not found.");

    if (!notification.isReadBy.includes(uid)) {
      await ctx.db.patch(args.notificationId, {
        isReadBy: [...notification.isReadBy, uid],
      });
    }

    return { success: true };
  },
});
