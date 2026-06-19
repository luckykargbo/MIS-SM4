import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// 🔴 ADMIN BLIND SPOT ENFORCER
// Call this at the top of EVERY finance function
// ─────────────────────────────────────────────────────────────────
async function enforceFinanceBlindSpot(ctx: any, requesterId: string) {
  const user = await ctx.db.get(requesterId);
  if (!user) throw new ConvexError("Unauthorized.");
  if (user.role === "admin") {
    throw new ConvexError("Access Denied: Administrators are strictly blocked from finance records via system-wide blind spot enforcement.");
  }
  return user;
}

// ─────────────────────────────────────────────────────────────────
// [FINANCE + STUDENT + ADMIN] Get a student's full financial record
// ─────────────────────────────────────────────────────────────────
export const getStudentFinance = query({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const requester = await enforceFinanceBlindSpot(ctx, args.requesterId);

    // Finance staff, the student themselves, and admin can see this
    if (requester.role !== "finance" && requester.role !== "student" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Insufficient privileges.");
    }

    const record = await ctx.db
      .query("finance")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .first();

    if (!record) throw new ConvexError("No financial record found.");
    return record;
  },
});

// ─────────────────────────────────────────────────────────────────
// [FINANCE + ADMIN] Get all outstanding balances (master ledger)
// ─────────────────────────────────────────────────────────────────
export const getMasterLedger = query({
  args: { requesterId: v.id("users") },
  handler: async (ctx, args) => {
    const requester = await enforceFinanceBlindSpot(ctx, args.requesterId);

    if (requester.role !== "finance" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Finance Staff or Admin only.");
    }

    const records = await ctx.db.query("finance").collect();
    const result = [];
    for (const r of records) {
      const student = await ctx.db.get(r.studentId);
      let name = "Unknown Student";
      let rollNumber = "N/A";
      let program = "N/A";
      if (student) {
        rollNumber = student.rollNumber;
        program = student.program;
        const u = await ctx.db.get(student.userId);
        if (u) {
          name = u.name;
        }
      }
      result.push({
        ...r,
        studentName: name,
        rollNumber,
        program,
      });
    }
    return result;
  },
});

// ─────────────────────────────────────────────────────────────────
// [FINANCE + ADMIN] Record a new payment / update balance
// ─────────────────────────────────────────────────────────────────
export const recordPayment = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    amount: v.number(),
    method: v.union(
      v.literal("cash"),
      v.literal("bank_transfer"),
      v.literal("mobile_money")
    ),
    reference: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await enforceFinanceBlindSpot(ctx, args.requesterId);

    if (requester.role !== "finance" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Finance Staff or Admin can record payments.");
    }

    // Get the student's finance record
    const financeRecord = await ctx.db
      .query("finance")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .first();

    if (!financeRecord) throw new ConvexError("Finance record not found.");

    const newAmountPaid = financeRecord.amountPaid + args.amount;
    const newBalance = financeRecord.tuitionFee - newAmountPaid;
    const isCleared = newBalance <= 0;

    // Update the finance record
    await ctx.db.patch(financeRecord._id, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      isCleared,
      lastUpdatedBy: args.requesterId,
      updatedAt: Date.now(),
    });

    // Log the immutable transaction
    await ctx.db.insert("transactions", {
      financeId: financeRecord._id,
      studentId: args.studentId,
      amount: args.amount,
      type: "payment",
      method: args.method,
      reference: args.reference,
      processedBy: args.requesterId,
      timestamp: Date.now(),
      notes: args.notes,
    });

    return { success: true, newBalance, isCleared };
  },
});

// ─────────────────────────────────────────────────────────────────
// [FINANCE + ADMIN] Create initial finance record for a new student
// ─────────────────────────────────────────────────────────────────
export const createFinanceRecord = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    academicYear: v.string(),
    semester: v.number(),
    tuitionFee: v.number(),
  },
  handler: async (ctx, args) => {
    const requester = await enforceFinanceBlindSpot(ctx, args.requesterId);

    if (requester.role !== "finance" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Finance Staff or Admin can create financial records.");
    }

    return await ctx.db.insert("finance", {
      studentId: args.studentId,
      academicYear: args.academicYear,
      semester: args.semester,
      tuitionFee: args.tuitionFee,
      amountPaid: 0,
      balance: args.tuitionFee,
      isCleared: false,
      invoiceLines: [],
      lastUpdatedBy: args.requesterId,
      updatedAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────
// [FINANCE + ADMIN + STUDENT] Get full transaction history
// ─────────────────────────────────────────────────────────────────
export const getTransactionHistory = query({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    await enforceFinanceBlindSpot(ctx, args.requesterId);

    return await ctx.db
      .query("transactions")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────
// [FINANCE + ADMIN] Get aggregate finance stats
// ─────────────────────────────────────────────────────────────────
export const getFinanceOverviewStats = query({
  args: { requesterId: v.id("users") },
  handler: async (ctx, args) => {
    const requester = await enforceFinanceBlindSpot(ctx, args.requesterId);

    if (requester.role !== "finance" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Finance Staff or Admin only.");
    }

    const records = await ctx.db.query("finance").collect();
    let totalFundsTracked = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let clearedCount = 0;

    for (const r of records) {
      totalFundsTracked += r.tuitionFee;
      totalCollected += r.amountPaid;
      totalOutstanding += r.balance;
      if (r.isCleared) clearedCount++;
    }

    const transactions = await ctx.db.query("transactions").collect();
    const logs = await ctx.db.query("securityLogs").collect();
    const discrepancies = logs.filter(
      (l) => l.event === "login_failure" || l.event === "otp_failure"
    ).length;

    return {
      totalFundsTracked,
      totalCollected,
      totalOutstanding,
      clearedCount,
      totalCount: records.length,
      transactionCount: transactions.length,
      discrepancies,
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// [FINANCE + ADMIN] Get all transactions for the audit trail
// ─────────────────────────────────────────────────────────────────
export const getAllTransactions = query({
  args: { requesterId: v.id("users") },
  handler: async (ctx, args) => {
    const requester = await enforceFinanceBlindSpot(ctx, args.requesterId);

    if (requester.role !== "finance" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Finance Staff or Admin only.");
    }

    const txs = await ctx.db.query("transactions").order("desc").take(15);
    const result = [];
    for (const tx of txs) {
      const student = await ctx.db.get(tx.studentId);
      let studentName = "Unknown Student";
      let rollNumber = "N/A";
      if (student) {
        rollNumber = student.rollNumber;
        const u = await ctx.db.get(student.userId);
        if (u) {
          studentName = u.name;
        }
      }
      result.push({
        ...tx,
        studentName,
        rollNumber,
      });
    }
    return result;
  },
});
