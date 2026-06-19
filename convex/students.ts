import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// ─────────────────────────────────────────────────────────────────
// [ADMIN + REGISTRY] Get full student list (no financial data)
// ─────────────────────────────────────────────────────────────────
export const listStudents = query({
  args: { 
    requesterId: v.id("users"),
    faculty: v.optional(v.string()),
    academicYear: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    const allowed = ["admin", "registry", "finance"];
    if (!allowed.includes(requester.role)) {
      throw new ConvexError("Access Denied.");
    }

    const students = await ctx.db.query("students").collect();

    const filtered = students
      .filter((s: any) => !args.faculty || s.faculty === args.faculty)
      .filter((s: any) => !args.academicYear || s.academicYear === args.academicYear);

    const result = [];
    for (const s of filtered) {
      const u = await ctx.db.get(s.userId);
      const records = await ctx.db
        .query("academicRecords")
        .withIndex("by_studentId", (q: any) => q.eq("studentId", s._id))
        .collect();

      const financeRecord = await ctx.db
        .query("finance")
        .withIndex("by_studentId", (q: any) => q.eq("studentId", s._id))
        .filter((q: any) =>
          q.and(
            q.eq(q.field("academicYear"), s.academicYear),
            q.eq(q.field("semester"), s.semester)
          )
        )
        .first();
      const isFinanciallyCleared = financeRecord ? financeRecord.isCleared : false;

      result.push({
        _id: s._id,
        rollNumber: s.rollNumber,
        faculty: s.faculty,
        program: s.program,
        semester: s.semester,
        academicYear: s.academicYear,
        registryStatus: s.registryStatus,
        enrolledCourses: s.enrolledCourses,
        gender: s.gender,
        academicRecords: records,
        isFinanciallyCleared,
        transcriptRemoved: s.transcriptRemoved || false,
        userId: s.userId,
        name: u ? u.name : "Unknown Student",
        email: u ? u.email : "N/A",
        isActive: u ? u.isActive : false,
        profileImage: u ? u.profileImage : undefined,
      });
    }
    return result;
  },
});

// ─────────────────────────────────────────────────────────────────
// [ADMIN + REGISTRY] Create a new student record
// ─────────────────────────────────────────────────────────────────
export const createStudent = mutation({
  args: {
    requesterId: v.id("users"),
    userId: v.id("users"),
    rollNumber: v.string(),
    faculty: v.string(),
    program: v.string(),
    semester: v.number(),
    academicYear: v.string(),
    enrolledCourses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (!["admin", "registry"].includes(requester.role)) {
      throw new ConvexError("Access Denied: Admin or Registry only.");
    }

    // Check duplicate roll number
    const existing = await ctx.db
      .query("students")
      .withIndex("by_rollNumber", (q: any) => q.eq("rollNumber", args.rollNumber))
      .first();
    if (existing) throw new ConvexError("Roll number already exists.");

    return await ctx.db.insert("students", {
      userId: args.userId,
      rollNumber: args.rollNumber,
      faculty: args.faculty,
      program: args.program,
      semester: args.semester,
      academicYear: args.academicYear,
      registryStatus: "active",
      enrolledCourses: args.enrolledCourses,
      createdAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY ONLY] Update student academic status
// ─────────────────────────────────────────────────────────────────
export const updateStudentStatus = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    registryStatus: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("graduated"),
      v.literal("deferred")
    ),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    await ctx.db.patch(args.studentId, {
      registryStatus: args.registryStatus,
    });
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [STUDENT] Get own student profile
// ─────────────────────────────────────────────────────────────────
export const getMyProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("students")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .first();
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY] Enroll a student in a course
// ─────────────────────────────────────────────────────────────────
export const enrollCourse = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    courseName: v.string(),
    courseCode: v.string(),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    // Check if the student is already enrolled in this course
    const existing = await ctx.db
      .query("academicRecords")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .filter((q: any) => q.eq(q.field("courseCode"), args.courseCode))
      .first();

    if (existing) {
      throw new ConvexError(`Student is already enrolled in ${args.courseCode}.`);
    }

    const recordId = await ctx.db.insert("academicRecords", {
      studentId: args.studentId,
      courseName: args.courseName,
      courseCode: args.courseCode,
      status: "Enrolled",
      midtermStatus: "Normal",
      finalStatus: "Normal",
      createdAt: Date.now(),
    });

    // Also update the enrolledCourses array on the student record
    const student = await ctx.db.get(args.studentId);
    if (student) {
      const updated = [...student.enrolledCourses, args.courseCode];
      await ctx.db.patch(args.studentId, { enrolledCourses: updated });
    }

    return { success: true, recordId };
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY] Remove a course enrollment
// ─────────────────────────────────────────────────────────────────
export const removeCourse = mutation({
  args: {
    requesterId: v.id("users"),
    recordId: v.id("academicRecords"),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Academic record not found.");

    // Cannot remove a completed course
    if (record.status === "Completed") {
      throw new ConvexError("Cannot remove a completed course. Contact system administrator.");
    }

    // Remove from the student's enrolledCourses array
    const student = await ctx.db.get(record.studentId);
    if (student) {
      const updated = student.enrolledCourses.filter((c: string) => c !== record.courseCode);
      await ctx.db.patch(record.studentId, { enrolledCourses: updated });
    }

    await ctx.db.delete(args.recordId);
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY] Assign or update a grade for a course
// ─────────────────────────────────────────────────────────────────
export const assignGrade = mutation({
  args: {
    requesterId: v.id("users"),
    recordId: v.id("academicRecords"),
    grade: v.string(),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Academic record not found.");

    // Validate grade format (A+, A, A-, B+, B, B-, C+, C, C-, D, F)
    const validGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];
    if (!validGrades.includes(args.grade)) {
      throw new ConvexError(`Invalid grade. Valid grades: ${validGrades.join(", ")}`);
    }

    await ctx.db.patch(args.recordId, {
      grade: args.grade,
      status: "Completed",
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY + STUDENT] Get all academic records for a student
// ─────────────────────────────────────────────────────────────────
export const getStudentAcademicRecords = query({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    // Registry, Admin, and the student themselves can view
    if (requester.role !== "registry" && requester.role !== "admin" && requester.role !== "student") {
      throw new ConvexError("Access Denied.");
    }

    // If student, verify they're requesting their own records
    if (requester.role === "student") {
      const studentRecord = await ctx.db
        .query("students")
        .withIndex("by_userId", (q: any) => q.eq("userId", args.requesterId))
        .first();
      if (!studentRecord || studentRecord._id !== args.studentId) {
        throw new ConvexError("Access Denied: You can only view your own academic records.");
      }
    }

    return await ctx.db
      .query("academicRecords")
      .withIndex("by_studentId", (q: any) => q.eq("studentId", args.studentId))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY] Update course enrollment status
// ─────────────────────────────────────────────────────────────────
export const updateCourseStatus = mutation({
  args: {
    requesterId: v.id("users"),
    recordId: v.id("academicRecords"),
    status: v.union(
      v.literal("Enrolled"),
      v.literal("Completed"),
      v.literal("Deferred")
    ),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Academic record not found.");

    await ctx.db.patch(args.recordId, { status: args.status });
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [ADMIN + REGISTRY] Add a new course to catalog
// ─────────────────────────────────────────────────────────────────
export const addCourse = mutation({
  args: {
    requesterId: v.id("users"),
    courseName: v.string(),
    courseCode: v.string(),
    faculty: v.string(),
    credits: v.number(),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester || (requester.role !== "admin" && requester.role !== "registry")) {
      throw new ConvexError("Access Denied: Admin or Registry only.");
    }

    const code = args.courseCode.trim().toUpperCase();
    const existing = await ctx.db
      .query("courses")
      .withIndex("by_courseCode", (q: any) => q.eq("courseCode", code))
      .first();

    if (existing) {
      throw new ConvexError(`Course code ${code} already exists.`);
    }

    return await ctx.db.insert("courses", {
      courseName: args.courseName.trim(),
      courseCode: code,
      faculty: args.faculty,
      credits: args.credits,
      createdAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────
// [ANYONE] List all courses in the catalog
// ─────────────────────────────────────────────────────────────────
export const listAllCourses = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("courses").collect();
  },
});

// ─────────────────────────────────────────────────────────────────
// [STUDENT] Self-enroll in a course from the catalog
// ─────────────────────────────────────────────────────────────────
export const enrollInCourseCatalog = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const student = await ctx.db.get(args.studentId);
    if (!student) throw new ConvexError("Student profile not found.");

    if (student.userId !== args.requesterId) {
      throw new ConvexError("Access Denied: Can only enroll yourself.");
    }

    const course = await ctx.db.get(args.courseId);
    if (!course) throw new ConvexError("Course not found in catalog.");

    // Check if already enrolled in student's array
    if (student.enrolledCourses.includes(course.courseCode)) {
      throw new ConvexError("You are already enrolled in this course.");
    }

    // Insert academic record
    await ctx.db.insert("academicRecords", {
      studentId: args.studentId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      status: "Enrolled",
      midtermStatus: "Normal",
      finalStatus: "Normal",
      createdAt: Date.now(),
    });

    // Update student enrolledCourses
    const updated = [...student.enrolledCourses, course.courseCode];
    await ctx.db.patch(args.studentId, {
      enrolledCourses: updated,
    });

    return { success: true };
  },
});

export const ensureStudentProfile = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.role !== "student") return null;

    const existing = await ctx.db
      .query("students")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .first();
    
    if (existing) return existing;

    // Create default student profile
    const rollNumber = "LUC/" + new Date().getFullYear() + "/" + Math.floor(1000 + Math.random() * 9000);
    const studentId = await ctx.db.insert("students", {
      userId: args.userId,
      rollNumber,
      faculty: "Faculty of Information Technology",
      program: "Bachelor of Science in IT",
      semester: 1,
      academicYear: "2025/2026",
      registryStatus: "active",
      enrolledCourses: [],
      createdAt: Date.now(),
    });

    // Create default tuition ledger
    const defaultTuition = 15000;
    await ctx.db.insert("finance", {
      studentId,
      academicYear: "2025/2026",
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
      lastUpdatedBy: args.userId,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(studentId);
  }
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY] Update exam status for midterms/finals
// ─────────────────────────────────────────────────────────────────
export const updateExamStatus = mutation({
  args: {
    requesterId: v.id("users"),
    recordId: v.id("academicRecords"),
    type: v.union(v.literal("midterm"), v.literal("final")),
    status: v.union(v.literal("Normal"), v.literal("Deferred"), v.literal("Completed")),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Academic record not found.");

    if (args.type === "midterm") {
      await ctx.db.patch(args.recordId, { midtermStatus: args.status });
    } else {
      await ctx.db.patch(args.recordId, { finalStatus: args.status });
    }
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY] Update student general profile information (gender, program, etc)
// ─────────────────────────────────────────────────────────────────
export const updateStudentProfile = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    gender: v.optional(v.string()),
    program: v.optional(v.string()),
    semester: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new ConvexError("Student profile not found.");

    const patch: any = {};
    if (args.gender !== undefined) patch.gender = args.gender;
    if (args.program !== undefined) patch.program = args.program;
    if (args.semester !== undefined) patch.semester = args.semester;

    await ctx.db.patch(args.studentId, patch);
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY] Update student transcript removal/collection status
// ─────────────────────────────────────────────────────────────────
export const updateTranscriptStatus = mutation({
  args: {
    requesterId: v.id("users"),
    studentId: v.id("students"),
    transcriptRemoved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester) throw new ConvexError("Unauthorized.");

    if (requester.role !== "registry" && requester.role !== "admin") {
      throw new ConvexError("Access Denied: Registry Staff or Admin only.");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new ConvexError("Student profile not found.");

    await ctx.db.patch(args.studentId, {
      transcriptRemoved: args.transcriptRemoved,
    });
    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [STUDENT] Submit a new deferred assessment application
// ─────────────────────────────────────────────────────────────────
export const submitDeferredApplication = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("deferredApplications", {
      studentId: args.studentId,
      email: args.email,
      category: args.category,
      faculty: args.faculty,
      program: args.program,
      semester: args.semester,
      reason: args.reason,
      missedDate: args.missedDate,
      modules: args.modules,
      evidenceName: args.evidenceName,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────
// [STUDENT] Get deferred applications history
// ─────────────────────────────────────────────────────────────────
export const getStudentDeferredApplications = query({
  args: {
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deferredApplications")
      .withIndex("by_studentId", (q) => q.eq("studentId", args.studentId))
      .order("desc")
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY + ADMIN] List all deferred applications
// ─────────────────────────────────────────────────────────────────
export const listDeferredApplications = query({
  args: {
    requesterId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester || (requester.role !== "registry" && requester.role !== "admin")) {
      throw new ConvexError("Access Denied.");
    }

    const apps = await ctx.db.query("deferredApplications").collect();
    const result = [];

    for (const app of apps) {
      const student = await ctx.db.get(app.studentId);
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
        ...app,
        studentName: name,
        rollNumber,
        program: app.program || program,
        faculty: app.faculty || (student ? student.faculty : "N/A"),
        semester: app.semester || (student ? String(student.semester) : "N/A"),
      });
    }

    return result;
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY + ADMIN] Update deferred application status (approve/reject)
// ─────────────────────────────────────────────────────────────────
export const updateDeferredApplicationStatus = mutation({
  args: {
    requesterId: v.id("users"),
    applicationId: v.id("deferredApplications"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requester = await ctx.db.get(args.requesterId);
    if (!requester || (requester.role !== "registry" && requester.role !== "admin")) {
      throw new ConvexError("Access Denied.");
    }

    const app = await ctx.db.get(args.applicationId);
    if (!app) {
      throw new ConvexError("Application not found.");
    }

    await ctx.db.patch(args.applicationId, {
      status: args.status,
    });

    const student = await ctx.db.get(app.studentId);
    if (student) {
      const studentUser = await ctx.db.get(student.userId);
      if (studentUser) {
        // Log notification to portal
        const defaultMsg = args.status === "approved"
          ? `Your deferred exam application for module(s): ${app.modules} has been APPROVED. You are cleared to sit the exam.`
          : `Your deferred exam application for module(s): ${app.modules} has been DENIED.`;
        
        const notificationMsg = args.message ? args.message : defaultMsg;

        await ctx.db.insert("notifications", {
          userId: student.userId,
          fromUserId: args.requesterId,
          title: `Deferred Exam Application - ${args.status.toUpperCase()}`,
          message: notificationMsg,
          isReadBy: [],
          createdAt: Date.now(),
        });

        // Trigger email notification
        await ctx.scheduler.runAfter(0, api.emails.sendDeferredStatusEmail, {
          email: app.email,
          studentName: studentUser.name,
          modules: app.modules,
          status: args.status,
          customMessage: args.message,
        });
      }
    }

    return { success: true };
  },
});



