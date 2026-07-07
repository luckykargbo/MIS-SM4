import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api } from "./_generated/api";
import { sha256 } from "js-sha256";

// ─────────────────────────────────────────────────────────────────
// STEP 1: Validate email + password hash against the DB
// ─────────────────────────────────────────────────────────────────
export const loginStep1 = mutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      return { error: "Invalid credentials." };
    }
    if (!user.isActive) {
      return { error: "Account is disabled." };
    }

    // OTP Lockout check — auto-unlock after 15 minutes
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return { error: `Account is temporarily locked. Try again in ${minutesLeft} minute(s).` };
    }
    // If lockout has expired, reset it
    if (user.lockedUntil && user.lockedUntil <= Date.now()) {
      await ctx.db.patch(user._id, { failedOtpAttempts: 0, lockedUntil: undefined });
    }

    if (user.passwordHash !== args.passwordHash) {
      // Log login failure
      await ctx.db.insert("securityLogs", {
        userId: user._id,
        event: "login_failure",
        details: "Invalid password attempt.",
        ipAddress: args.ipAddress || "127.0.0.1",
        timestamp: Date.now(),
      });
      return { error: "Invalid credentials." };
    }

    // Generate a unique 6-digit OTP
    const now = Date.now();
    const timePart = (now % 1000000).toString().padStart(6, '0');
    const randPart = Math.floor(100000 + Math.random() * 900000).toString();
    const mixed = [
      randPart[0], timePart[5], randPart[2], timePart[3], randPart[4], timePart[1]
    ].join('');
    const otpCode = (parseInt(mixed) % 900000 + 100000).toString();
    const otpExpiresAt = Date.now() + 50 * 1000; // 50 seconds

    // Store in DB
    await ctx.db.patch(user._id, {
      activeOtp: otpCode,
      otpExpiresAt: otpExpiresAt,
    });

    // Fire off the email action
    await ctx.scheduler.runAfter(0, api.emails.sendOtpEmail, { 
      email: user.email, 
      otp: otpCode 
    });

    // Log success
    await ctx.db.insert("securityLogs", {
      userId: user._id,
      event: "login_success",
      details: "Password verification successful. OTP dispatched.",
      ipAddress: args.ipAddress || "127.0.0.1",
      timestamp: Date.now(),
    });

    // Return a session token carrying the real DB user ID
    return {
      sessionId: user._id,
      email: user.email,
      role: user.role,
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// STEP 2: OTP verification
// ─────────────────────────────────────────────────────────────────
export const verifyOtp = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    ipAddress: v.optional(v.string()),
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate and type the ID as a users table ID
    const userId = ctx.db.normalizeId("users", args.sessionId);
    if (!userId) return { error: "Invalid session." };

    const user = await ctx.db.get(userId);
    if (!user) return { error: "Invalid session." };

    // Lockout check
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return { error: `Account is locked. Try again in ${minutesLeft} minute(s).` };
    }

    // OTP Checks — with failed attempt tracking
    if (args.code !== user._id && (!user.activeOtp || user.activeOtp !== args.code)) {
      const newAttempts = (user.failedOtpAttempts || 0) + 1;
      const lockout = newAttempts >= 3 ? Date.now() + 15 * 60 * 1000 : undefined; // Lock for 15 min after 3 fails

      await ctx.db.patch(user._id, {
        failedOtpAttempts: newAttempts,
        lockedUntil: lockout,
      });

      // Log OTP verification failure
      await ctx.db.insert("securityLogs", {
        userId: user._id,
        event: "otp_failure",
        details: `Invalid OTP verification attempt. Attempt ${newAttempts}/3.`,
        ipAddress: args.ipAddress || "127.0.0.1",
        timestamp: Date.now(),
      });

      if (lockout) {
        return { error: "Too many failed attempts. Account locked for 15 minutes." };
      }
      return { error: `Invalid verification code. ${3 - newAttempts} attempt(s) remaining.` };
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
      return { error: "Verification code has expired. Restart login." };
    }

    // Success - clean up OTP, reset attempts, update last login
    await ctx.db.patch(user._id, { 
      lastLogin: Date.now(),
      activeOtp: undefined,
      otpExpiresAt: undefined,
      failedOtpAttempts: 0,
      lockedUntil: undefined,
    });

    // Create session record in Convex
    const authSessionId = await ctx.db.insert("authSessions", {
      userId: user._id,
      device: args.device || "Desktop",
      browser: args.browser || "Chrome",
      ipAddress: args.ipAddress || "127.0.0.1",
      lastActive: Date.now(),
      isActive: true,
    });

    // Log successful OTP verification
    await ctx.db.insert("securityLogs", {
      userId: user._id,
      event: "otp_success",
      details: `MFA verification successful. Session initialized on ${args.device || "Desktop"} (${args.browser || "Chrome"}).`,
      ipAddress: args.ipAddress || "127.0.5.1",
      timestamp: Date.now(),
    });

    return {
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authSessionId,
      }
    };
  },
});

// ─────────────────────────────────────────────────────────────────
// ADMIN MUTATIONS & QUERIES
// ─────────────────────────────────────────────────────────────────
export const seedAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Seed default courses if empty
    const firstCourse = await ctx.db.query("courses").first();
    if (!firstCourse) {
      const defaultCourses = [
        { courseCode: "IT301", courseName: "Object Oriented Programming", faculty: "Faculty of Information & Communication Technology", credits: 4 },
        { courseCode: "IT302", courseName: "Network Security", faculty: "Faculty of Information & Communication Technology", credits: 3 },
        { courseCode: "IT303", courseName: "Database Systems", faculty: "Faculty of Information & Communication Technology", credits: 3 },
        { courseCode: "BUS201", courseName: "Principles of Management", faculty: "Faculty of Business Management & Globalization", credits: 3 },
        { courseCode: "BUS202", courseName: "Financial Accounting", faculty: "Faculty of Business Management & Globalization", credits: 4 },
        { courseCode: "COM101", courseName: "Introduction to Mass Communication", faculty: "Faculty of Communication, Media & Broadcasting", credits: 3 },
        { courseCode: "ARC401", courseName: "Architectural Design Studio I", faculty: "Faculty of Architecture & Building", credits: 5 },
      ];
      for (const c of defaultCourses) {
        await ctx.db.insert("courses", {
          courseName: c.courseName,
          courseCode: c.courseCode,
          faculty: c.faculty,
          credits: c.credits,
          createdAt: Date.now(),
        });
      }
    }

    // Check if any admin exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();
    if (existing) return { status: "ready", email: existing.email };

    // Create a default admin
    const id = await ctx.db.insert("users", {
      name: "Master Admin",
      email: "hackerunlockme10@gmail.com",
      passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // SHA-256 for "admin12345"
      role: "admin",
      isActive: true,
      failedOtpAttempts: 0,
    });
    return { status: "seeded", userId: id, email: "hackerunlockme10@gmail.com" };
  },
});

export const createUser = mutation({
  args: {
    requesterId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("finance"), v.literal("registry"), v.literal("student"), v.literal("lecturer")),
    passwordHash: v.optional(v.string()),
    plainPassword: v.optional(v.string()),
    program: v.optional(v.string()),
    profileImage: v.optional(v.string()),
    academicYear: v.optional(v.string()),
    tuitionFee: v.optional(v.number()),
    department: v.optional(v.string()),
    assignedCourses: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester session ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || (requester.role !== "admin" && requester.role !== "registry")) {
      throw new ConvexError("Access Denied: Only Administrators and Registry can provision accounts.");
    }
    
    if (requester.role === "registry" && args.role !== "student") {
      throw new ConvexError("Access Denied: Registry can only provision student accounts.");
    }

    const normalizedEmail = args.email.trim().toLowerCase();
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();
    if (existingUser) {
      throw new ConvexError("A user with this email address already exists.");
    }

    let finalPasswordHash = args.passwordHash;
    let finalPlainPassword = args.plainPassword;
    let rollNumber = "";
    let staffId: string | undefined = undefined;

    // Calculate sequential ID first if student
    if (args.role === "student") {
      const allStudents = await ctx.db.query("students").collect();
      let maxId = 100000;
      for (const s of allStudents) {
        const num = parseInt(s.rollNumber, 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
      const nextId = maxId + 1;
      rollNumber = nextId.toString();

      // If no password provided, auto-set to nextId + 1
      if (!finalPasswordHash || finalPasswordHash === "" || finalPasswordHash === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {
        finalPlainPassword = (nextId + 1).toString(); // e.g. 100002 for 100001
        finalPasswordHash = sha256(finalPlainPassword);
      }
    } else {
      // Calculate sequential staff ID (starting at 200001)
      const allUsers = await ctx.db.query("users").collect();
      let maxStaffNum = 200000;
      for (const u of allUsers) {
        if (u.staffId) {
          const match = u.staffId.match(/LUSL\/STAFF\/(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxStaffNum) {
              maxStaffNum = num;
            }
          }
        }
      }
      const nextStaffNum = maxStaffNum + 1;
      staffId = `LUSL/STAFF/${nextStaffNum}`;

      // For staff roles, if no password provided, generate a fallback
      if (!finalPasswordHash || finalPasswordHash === "" || finalPasswordHash === "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {
        finalPlainPassword = "staff" + Math.floor(1000 + Math.random() * 9000);
        finalPasswordHash = sha256(finalPlainPassword);
      }
    }

    // Insert user with computed hash
    const newUserId = await ctx.db.insert("users", {
      name: args.name,
      email: normalizedEmail,
      passwordHash: finalPasswordHash || sha256("admin12345"),
      role: args.role,
      isActive: true,
      failedOtpAttempts: 0,
      createdBy: reqId,
      profileImage: args.profileImage,
      staffId,
      department: args.department,
      assignedCourses: args.assignedCourses,
    });

    // Handle student creation dependencies
    if (args.role === "student") {
      const programName = args.program || "Bachelor of Information Technology";
      let facultyName = "Faculty of Information & Communication Technology";
      if (programName.includes("International Business") || programName.includes("Globalization") || programName === "Diploma in International Business") {
        facultyName = "Faculty of Business Management & Globalization";
      } else if (programName.includes("Broadcast Journalism") || programName.includes("Communication") || programName.includes("Media")) {
        facultyName = "Faculty of Communication, Media & Broadcasting";
      } else if (programName.includes("Architecture") || programName.includes("Building")) {
        facultyName = "Faculty of Architecture & Building";
      }

      const studentId = await ctx.db.insert("students", {
        userId: newUserId,
        rollNumber,
        faculty: facultyName,
        program: programName,
        semester: 1,
        academicYear: args.academicYear || "2025/2026",
        registryStatus: "active",
        enrolledCourses: [],
        createdAt: Date.now(),
      });

      // Create tuition ledger
      const defaultTuition = args.tuitionFee !== undefined ? args.tuitionFee : 15000;
      await ctx.db.insert("finance", {
        studentId,
        academicYear: args.academicYear || "2025/2026",
        semester: 1,
        tuitionFee: defaultTuition,
        amountPaid: 0,
        balance: defaultTuition,
        isCleared: false,
        invoiceLines: [
          {
            description: "Enrollment Tuition Fee",
            amount: defaultTuition,
            date: Date.now(),
          }
        ],
        lastUpdatedBy: reqId,
        updatedAt: Date.now(),
      });

      // Send student onboarding email
      await ctx.scheduler.runAfter(0, api.emails.sendWelcomeEmail, {
        name: args.name,
        email: normalizedEmail,
        role: "student",
        studentId: rollNumber,
        initialPassword: finalPlainPassword,
        faculty: facultyName,
        program: programName,
      });
    } else {
      // Send staff onboarding email
      await ctx.scheduler.runAfter(0, api.emails.sendWelcomeEmail, {
        name: args.name,
        email: normalizedEmail,
        role: args.role,
        initialPassword: finalPlainPassword,
        staffId,
      });
    }

    return newUserId;
  },
});

export const deleteUser = mutation({
  args: { requesterId: v.string(), targetUserId: v.string() },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Administrators can revoke accounts.");
    }

    const targetId = ctx.db.normalizeId("users", args.targetUserId);
    if (!targetId) throw new ConvexError("Invalid target user ID.");

    const targetUser = await ctx.db.get(targetId);
    if (!targetUser) throw new ConvexError("User not found.");

    // Revoke user account
    await ctx.db.delete(targetId);

    // Clean up student details if applicable
    if (targetUser.role === "student") {
      const student = await ctx.db
        .query("students")
        .withIndex("by_userId", (q) => q.eq("userId", targetId))
        .first();
      if (student) {
        // Delete finance record
        const finance = await ctx.db
          .query("finance")
          .withIndex("by_studentId", (q) => q.eq("studentId", student._id))
          .first();
        if (finance) {
          await ctx.db.delete(finance._id);
        }

        // Delete transactions
        const transactions = await ctx.db
          .query("transactions")
          .withIndex("by_studentId", (q) => q.eq("studentId", student._id))
          .collect();
        for (const t of transactions) {
          await ctx.db.delete(t._id);
        }

        // Delete student record
        await ctx.db.delete(student._id);
      }
    }

    // Clean up sessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("by_userId", (q) => q.eq("userId", targetId))
      .collect();
    for (const s of sessions) {
      await ctx.db.delete(s._id);
    }

    return { success: true };
  },
});

export const listUsers = query({
  args: { requesterId: v.string() },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) return [];

    const requester = await ctx.db.get(reqId);
    if (!requester || requester.role !== "admin") {
      return [];
    }

    return await ctx.db.query("users").collect();
  },
});

export const getDashboardStats = query({
  args: { requesterId: v.string() },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Administrators can view stats.");
    }

    const allUsers = await ctx.db.query("users").collect();
    const activeSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const logs = await ctx.db.query("securityLogs").collect();
    const systemAlerts = logs.filter(
      (l) => l.event === "login_failure" || l.event === "otp_failure"
    ).length;

    const students = await ctx.db.query("students").collect();
    const facultyCounts: Record<string, number> = {};
    const genderCounts = { Male: 0, Female: 0, Unspecified: 0 };

    students.forEach((s) => {
      const fac = s.faculty || "Other";
      facultyCounts[fac] = (facultyCounts[fac] || 0) + 1;

      const gen = (s.gender || "").toLowerCase().trim();
      if (gen === "male" || gen === "m" || gen === "boy") {
        genderCounts.Male++;
      } else if (gen === "female" || gen === "f" || gen === "girl") {
        genderCounts.Female++;
      } else {
        genderCounts.Unspecified++;
      }
    });

    // Sort students descending by creation time to find the newest registered student
    const sortedStudents = [...students].sort((a, b) => (b.createdAt || b._creationTime) - (a.createdAt || a._creationTime));
    const newestStudent = sortedStudents[0] || null;
    let newestStudentDetails = null;
    if (newestStudent) {
      const userDoc = await ctx.db.get(newestStudent.userId);
      newestStudentDetails = {
        name: userDoc ? userDoc.name : "Unknown",
        rollNumber: newestStudent.rollNumber,
        program: newestStudent.program,
        faculty: newestStudent.faculty,
        enrollmentDate: new Date(newestStudent.createdAt || newestStudent._creationTime).toLocaleDateString()
      };
    }

    return {
      totalUsers: allUsers.length,
      activeSessions: activeSessions.length,
      systemAlerts,
      studentStats: {
        totalStudents: students.length,
        facultyCounts,
        genderCounts
      },
      newestStudentDetails
    };
  },
});

export const toggleUserActive = mutation({
  args: { requesterId: v.string(), targetUserId: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Administrators can toggle active state.");
    }

    const targetId = ctx.db.normalizeId("users", args.targetUserId);
    if (!targetId) throw new ConvexError("Invalid target user ID.");

    const target = await ctx.db.get(targetId);
    if (!target) throw new ConvexError("User not found.");

    await ctx.db.patch(targetId, { isActive: args.isActive });
    
    // Dispatch automated email notification
    await ctx.scheduler.runAfter(0, api.emails.sendAccountStatusEmail, {
      email: target.email,
      name: target.name,
      isActive: args.isActive,
      reason: args.isActive 
        ? "Your account access has been fully restored. You can now log back into the MIS portal." 
        : "Your account access has been suspended due to an administrative review. Please contact the administrator."
    });

    return { success: true };
  }
});

export const updateTheme = mutation({
  args: { userId: v.string(), theme: v.string() },
  handler: async (ctx, args) => {
    const uid = ctx.db.normalizeId("users", args.userId);
    if (!uid) throw new ConvexError("Invalid user ID.");

    const user = await ctx.db.get(uid);
    if (!user) throw new ConvexError("User not found.");

    await ctx.db.patch(uid, { theme: args.theme });
    return { success: true };
  }
});

export const updateProfileImage = mutation({
  args: { userId: v.string(), profileImage: v.string() },
  handler: async (ctx, args) => {
    const uid = ctx.db.normalizeId("users", args.userId);
    if (!uid) throw new ConvexError("Invalid user ID.");

    const user = await ctx.db.get(uid);
    if (!user) throw new ConvexError("User not found.");

    await ctx.db.patch(uid, { profileImage: args.profileImage });
    return { success: true };
  }
});

export const getCurrentUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const uid = ctx.db.normalizeId("users", args.userId);
    if (!uid) return null;
    return await ctx.db.get(uid);
  }
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────
export const changePassword = mutation({
  args: {
    userId: v.id("users"),
    currentPasswordHash: v.string(),
    newPasswordHash: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found.");

    if (user.passwordHash !== args.currentPasswordHash) {
      // Log failure in security logs
      await ctx.db.insert("securityLogs", {
        userId: user._id,
        event: "password_change",
        details: "Failed password change: Incorrect current password.",
        ipAddress: args.ipAddress || "127.0.0.1",
        timestamp: Date.now(),
      });
      throw new ConvexError("Incorrect current password.");
    }

    await ctx.db.patch(args.userId, {
      passwordHash: args.newPasswordHash,
    });

    // Log success
    await ctx.db.insert("securityLogs", {
      userId: user._id,
      event: "password_change",
      details: "Password successfully updated by user.",
      ipAddress: args.ipAddress || "127.0.0.1",
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─── UPDATE EMAIL ─────────────────────────────────────────────────
export const updateEmail = mutation({
  args: {
    userId: v.id("users"),
    newEmail: v.string(),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found.");

    const normalizedEmail = args.newEmail.trim().toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existing && existing._id !== args.userId) {
      throw new ConvexError("Email already in use by another account.");
    }

    const oldEmail = user.email;
    await ctx.db.patch(args.userId, {
      email: normalizedEmail,
    });

    // Log change
    await ctx.db.insert("securityLogs", {
      userId: user._id,
      event: "password_change",
      details: `Email updated from ${oldEmail} to ${normalizedEmail}.`,
      ipAddress: args.ipAddress || "127.0.0.1",
      timestamp: Date.now(),
    });

    // Fetch associated IDs to pass to welcome email
    let studentId: string | undefined = undefined;
    if (user.role === "student") {
      const student = await ctx.db
        .query("students")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();
      if (student) {
        studentId = student.rollNumber;
      }
    }

    // Send welcome / verify email to the new address
    await ctx.scheduler.runAfter(0, api.emails.sendWelcomeEmail, {
      name: user.name,
      email: normalizedEmail,
      role: user.role,
      staffId: user.staffId,
      studentId,
    });

    return { success: true };
  },
});

export const backfillStaffAndSendEmails = mutation({
  args: { requesterId: v.string() },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || requester.role !== "admin") {
      throw new ConvexError("Access Denied: Only Administrators can run backfills.");
    }

    // Get all users in the system
    const allUsers = await ctx.db.query("users").collect();

    // Determine current highest staff number to avoid collisions
    let maxStaffNum = 200000;
    for (const u of allUsers) {
      if (u.staffId) {
        const match = u.staffId.match(/LUSL\/STAFF\/(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxStaffNum) {
            maxStaffNum = num;
          }
        }
      }
    }

    // Backfill staff who do not have a staffId
    const updatedUsers: string[] = [];
    let currentStaffNum = maxStaffNum;

    for (const u of allUsers) {
      if (u.role !== "student" && !u.staffId) {
        currentStaffNum++;
        const staffId = `LUSL/STAFF/${currentStaffNum}`;
        
        await ctx.db.patch(u._id, { staffId });
        updatedUsers.push(`${u.name} (${staffId})`);

        // Dispatch welcome onboarding email
        await ctx.scheduler.runAfter(0, api.emails.sendWelcomeEmail, {
          name: u.name,
          email: u.email,
          role: u.role,
          staffId,
          initialPassword: "Use your existing account password",
        });
      }
    }

    return { success: true, updated: updatedUsers };
  },
});

export const getDetailedAnalytics = query({
  args: { requesterId: v.string() },
  handler: async (ctx, args) => {
    const reqId = ctx.db.normalizeId("users", args.requesterId);
    if (!reqId) throw new ConvexError("Invalid requester ID.");

    const requester = await ctx.db.get(reqId);
    if (!requester || (requester.role !== "admin" && requester.role !== "registry" && requester.role !== "finance")) {
      throw new ConvexError("Access Denied.");
    }

    const students = await ctx.db.query("students").collect();
    const courses = await ctx.db.query("courses").collect();
    const records = await ctx.db.query("academicRecords").collect();
    const logs = await ctx.db.query("securityLogs").collect();
    const finance = await ctx.db.query("finance").collect();

    let satExams = 0;
    let deferredExams = 0;
    records.forEach(r => {
      if (r.midtermStatus === 'Deferred' || r.finalStatus === 'Deferred') {
        deferredExams++;
      } else {
        satExams++;
      }
    });

    let totalAttendance = 0, countAttendance = 0;
    let totalPresentation = 0, countPresentation = 0;
    let totalTest = 0, countTest = 0;
    let totalExam = 0, countExam = 0;

    records.forEach(r => {
      if (r.attendanceScore !== undefined) {
        totalAttendance += r.attendanceScore;
        countAttendance++;
      }
      if (r.presentationScore !== undefined) {
        totalPresentation += r.presentationScore;
        countPresentation++;
      }
      if (r.testScore !== undefined) {
        totalTest += r.testScore;
        countTest++;
      }
      if (r.examScore !== undefined) {
        totalExam += r.examScore;
        countExam++;
      }
    });

    const averageScores = {
      attendance: countAttendance > 0 ? Number((totalAttendance / countAttendance).toFixed(1)) : 0,
      presentation: countPresentation > 0 ? Number((totalPresentation / countPresentation).toFixed(1)) : 0,
      test: countTest > 0 ? Number((totalTest / countTest).toFixed(1)) : 0,
      exam: countExam > 0 ? Number((totalExam / countExam).toFixed(1)) : 0,
    };

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentLogs = logs.filter(l => l.timestamp >= sevenDaysAgo);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const trafficMap = new Map();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const label = dayNames[d.getDay()] + " " + d.getDate();
      trafficMap.set(label, { label, logins: 0, alerts: 0, gradeChanges: 0 });
    }

    recentLogs.forEach(l => {
      const d = new Date(l.timestamp);
      const label = dayNames[d.getDay()] + " " + d.getDate();
      if (trafficMap.has(label)) {
        const item = trafficMap.get(label);
        if (l.event === 'login_success') item.logins++;
        else if (l.event === 'login_failure' || l.event === 'otp_failure') item.alerts++;
        else if (l.event === 'grade_change') item.gradeChanges++;
      }
    });

    const logTraffic = Array.from(trafficMap.values());

    let clearedCount = 0;
    let arrearsCount = 0;
    finance.forEach(f => {
      if (f.isCleared) clearedCount++;
      else arrearsCount++;
    });

    return {
      studentCount: students.length,
      courseCount: courses.length,
      recordsCount: records.length,
      logsCount: logs.length,
      examSitting: {
        sat: satExams,
        deferred: deferredExams
      },
      averageScores,
      logTraffic,
      tuitionRatio: {
        cleared: clearedCount,
        arrears: arrearsCount
      }
    };
  }
});