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
      status: "verified",
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
    const pendingVerificationsCount = transactions.filter(t => t.status === "pending").length;
    
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
      pendingVerificationsCount,
      discrepancies,
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// [STUDENT] Submit a payment proof for verification
// ─────────────────────────────────────────────────────────────────
export const submitPaymentProof = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    amount: v.number(),
    method: v.union(v.literal("cash"), v.literal("bank_transfer"), v.literal("mobile_money")),
    reference: v.string(),
    proofReceipt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester || requester.role !== "student") throw new ConvexError("Only students can submit payment proofs.");

    const financeRecord = await ctx.db
      .query("finance")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .first();

    if (!financeRecord) throw new ConvexError("No finance record found to apply payment to.");

    await ctx.db.insert("transactions", {
      financeId: financeRecord._id,
      studentId: args.studentId,
      amount: args.amount,
      type: "payment",
      method: args.method,
      status: "pending",
      reference: args.reference,
      proofReceipt: args.proofReceipt,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [FINANCE + ADMIN] Verify a pending payment
// ─────────────────────────────────────────────────────────────────
export const verifyPaymentProof = mutation({
  args: {
    requesterId: v.id("users"),
    transactionId: v.id("transactions"),
    action: v.union(v.literal("verify"), v.literal("reject")),
    actualAmount: v.optional(v.number()), // Finance can correct forged amounts
  },
  handler: async (ctx, args) => {
    const requester = await enforceFinanceBlindSpot(ctx, args.requesterId);
    if (requester.role !== "finance" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Finance Staff or Admin can verify payments.");
    }

    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) throw new ConvexError("Transaction not found.");
    if (transaction.status !== "pending") throw new ConvexError("Transaction is already " + transaction.status);

    if (args.action === "reject") {
      await ctx.db.patch(transaction._id, { status: "rejected", processedBy: args.requesterId });
      return { success: true, status: "rejected" };
    }

    // Process Verification
    const financeRecord = await ctx.db.get(transaction.financeId);
    if (!financeRecord) throw new ConvexError("Finance record missing.");

    const finalAmount = args.actualAmount !== undefined ? args.actualAmount : transaction.amount;
    const newAmountPaid = financeRecord.amountPaid + finalAmount;
    const newBalance = financeRecord.tuitionFee - newAmountPaid;
    const isCleared = newBalance <= 0;

    await ctx.db.patch(financeRecord._id, {
      amountPaid: newAmountPaid,
      balance: newBalance,
      isCleared,
      lastUpdatedBy: args.requesterId,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(transaction._id, {
      status: "verified",
      amount: finalAmount, // Update to the real amount confirmed by Finance
      processedBy: args.requesterId,
    });

    return { success: true, status: "verified", finalAmount };
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

// ─────────────────────────────────────────────────────────────────
// [INTERNAL / REGISTRY / ADMIN] Bill a new semester fee upon promotion
// ─────────────────────────────────────────────────────────────────
export const billSemesterFee = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    amount: v.number(),
    description: v.string(),
    academicYear: v.string(),
    semester: v.number(),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");
    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Only registry staff or admins can bill fee rollovers.");
    }

    const financeRecord = await ctx.db
      .query("finance")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .first();

    if (!financeRecord) {
      await ctx.db.insert("finance", {
        studentId: args.studentId,
        academicYear: args.academicYear,
        semester: args.semester,
        tuitionFee: args.amount,
        amountPaid: 0,
        balance: args.amount,
        isCleared: false,
        invoiceLines: [
          {
            description: args.description,
            amount: args.amount,
            date: Date.now(),
          }
        ],
        lastUpdatedBy: args.requesterId,
        updatedAt: Date.now(),
      });
    } else {
      const newTuitionFee = financeRecord.tuitionFee + args.amount;
      const newBalance = financeRecord.balance + args.amount;
      const updatedInvoiceLines = [...financeRecord.invoiceLines, {
        description: args.description,
        amount: args.amount,
        date: Date.now(),
      }];

      await ctx.db.patch(financeRecord._id, {
        tuitionFee: newTuitionFee,
        balance: newBalance,
        isCleared: newBalance <= 0,
        invoiceLines: updatedInvoiceLines,
        academicYear: args.academicYear,
        semester: args.semester,
        lastUpdatedBy: args.requesterId,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});
