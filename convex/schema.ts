import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── USERS TABLE ──────────────────────────────────────────────
  // Holds all system users: Admin, Finance, Registry, Student
  users: defineTable({
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),       // bcrypt hash — never store plain text
    role: v.union(
      v.literal("admin"),
      v.literal("finance"),
      v.literal("registry"),
      v.literal("student")
    ),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")), // Admin who provisioned this account
    failedOtpAttempts: v.number(),
    lockedUntil: v.optional(v.number()), // Unix timestamp
    lastLogin: v.optional(v.number()),
    activeOtp: v.optional(v.string()),
    otpExpiresAt: v.optional(v.number()),
    profileImage: v.optional(v.string()), // base64 representation of profile pic
    theme: v.optional(v.string()), // "light" or "dark"
    staffId: v.optional(v.string()), // unique identifier for administrative staff
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // ─── STUDENTS TABLE ───────────────────────────────────────────
  // Academic metadata only — NO financial data here
  students: defineTable({
    userId: v.id("users"),
    rollNumber: v.string(),
    faculty: v.string(),
    program: v.string(),
    semester: v.number(),
    academicYear: v.string(),
    registryStatus: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("graduated"),
      v.literal("deferred")
    ),
    enrolledCourses: v.array(v.string()),
    gender: v.optional(v.string()),
    transcriptRemoved: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_rollNumber", ["rollNumber"]),

  // ─── FINANCE TABLE ────────────────────────────────────────────
  // ADMIN IS STRICTLY BLOCKED from this table via server-side checks
  finance: defineTable({
    studentId: v.id("students"),
    academicYear: v.string(),
    semester: v.number(),
    tuitionFee: v.number(),         // in Leones (SLE)
    amountPaid: v.number(),
    balance: v.number(),
    isCleared: v.boolean(),
    invoiceLines: v.array(
      v.object({
        description: v.string(),
        amount: v.number(),
        date: v.number(),
      })
    ),
    lastUpdatedBy: v.id("users"),   // Must be a finance staff member
    updatedAt: v.number(),
  })
    .index("by_studentId", ["studentId"])
    .index("by_isCleared", ["isCleared"]),

  // ─── TRANSACTIONS TABLE ───────────────────────────────────────
  // Immutable payment audit trail — Admin CANNOT read this
  transactions: defineTable({
    financeId: v.id("finance"),
    studentId: v.id("students"),
    amount: v.number(),
    type: v.union(
      v.literal("payment"),
      v.literal("refund"),
      v.literal("adjustment")
    ),
    method: v.union(
      v.literal("cash"),
      v.literal("bank_transfer"),
      v.literal("mobile_money")
    ),
    reference: v.string(),
    processedBy: v.id("users"),     // Finance staff who recorded it
    timestamp: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_studentId", ["studentId"])
    .index("by_financeId", ["financeId"]),

  // ─── ACADEMIC RECORDS TABLE ─────────────────────────────────
  // Individual course enrollments + grades (managed by Registry)
  academicRecords: defineTable({
    studentId: v.id("students"),
    courseName: v.string(),
    courseCode: v.string(),
    status: v.union(
      v.literal("Enrolled"),
      v.literal("Completed"),
      v.literal("Deferred")
    ),
    grade: v.optional(v.string()),
    midtermStatus: v.optional(v.union(v.literal("Normal"), v.literal("Deferred"), v.literal("Completed"))),
    finalStatus: v.optional(v.union(v.literal("Normal"), v.literal("Deferred"), v.literal("Completed"))),
    createdAt: v.number(),
  })
    .index("by_studentId", ["studentId"])
    .index("by_courseCode", ["courseCode"]),

  // ─── AUTH SESSIONS TABLE ─────────────────────────────────────
  authSessions: defineTable({
    userId: v.id("users"),
    device: v.string(),
    browser: v.string(),
    ipAddress: v.string(),
    lastActive: v.number(),
    isActive: v.boolean(),
  }).index("by_userId", ["userId"]),

  // ─── SECURITY LOGS TABLE ──────────────────────────────────────
  securityLogs: defineTable({
    userId: v.id("users"),
    event: v.union(
      v.literal("login_success"),
      v.literal("login_failure"),
      v.literal("otp_success"),
      v.literal("otp_failure"),
      v.literal("session_terminated"),
      v.literal("password_change")
    ),
    details: v.string(),
    ipAddress: v.string(),
    timestamp: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── COURSES TABLE ──────────────────────────────────────────────
  courses: defineTable({
    courseName: v.string(),
    courseCode: v.string(),
    faculty: v.string(),
    credits: v.number(),
    createdAt: v.number(),
  }).index("by_courseCode", ["courseCode"]),

  // ─── NOTIFICATIONS TABLE ──────────────────────────────────────
  notifications: defineTable({
    userId: v.union(v.id("users"), v.literal("all")),
    fromUserId: v.id("users"),
    title: v.string(),
    message: v.string(),
    isReadBy: v.array(v.id("users")),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

  // ─── DEFERRED APPLICATIONS TABLE ─────────────────────────────
  deferredApplications: defineTable({
    studentId: v.id("students"),
    email: v.string(),
    category: v.string(),
    faculty: v.optional(v.string()),
    program: v.optional(v.string()),
    semester: v.optional(v.string()),
    reason: v.string(),
    missedDate: v.string(),
    modules: v.string(),
    evidenceName: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
  })
    .index("by_studentId", ["studentId"])
    .index("by_status", ["status"]),
  // ─── ADMISSIONS SETTINGS TABLE ──────────────────────────────
  admissionsSettings: defineTable({
    isOpen: v.boolean(),
    lastUpdatedBy: v.id("users"),
    updatedAt: v.number(),
  }),

  // ─── APPLICATIONS TABLE ─────────────────────────────────────
  applications: defineTable({
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
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    reviewedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),
});

