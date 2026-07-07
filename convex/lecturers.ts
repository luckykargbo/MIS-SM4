import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { api } from "./_generated/api";

// ─────────────────────────────────────────────────────────────────
// [LECTURER] List unique courses available in the system
// ─────────────────────────────────────────────────────────────────
export const listAllActiveCourses = query({
  args: { requesterId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || user.role !== "lecturer") {
      throw new ConvexError("Access Denied: Lecturers only.");
    }

    const records = await ctx.db.query("academicRecords").collect();
    const courses = new Map();
    for (const r of records) {
      if (user.assignedCourses && user.assignedCourses.length > 0 && !user.assignedCourses.includes(r.courseCode)) {
        continue;
      }
      courses.set(r.courseCode, {
        courseCode: r.courseCode,
        courseName: r.courseName,
      });
    }
    // Also include assignedCourses if they have no enrolled students yet
    if (user.assignedCourses && user.assignedCourses.length > 0) {
      for (const code of user.assignedCourses) {
        if (!courses.has(code)) {
          const course = await ctx.db
            .query("courses")
            .withIndex("by_courseCode", (q) => q.eq("courseCode", code))
            .first();
          courses.set(code, {
            courseCode: code,
            courseName: course?.courseName || "Course Class",
          });
        }
      }
    }
    return Array.from(courses.values());
  },
});

// ─────────────────────────────────────────────────────────────────
// [LECTURER] List students enrolled in a specific course code
// ─────────────────────────────────────────────────────────────────
export const getStudentsForCourse = query({
  args: { requesterId: v.id("users"), courseCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || user.role !== "lecturer") {
      throw new ConvexError("Access Denied: Lecturers only.");
    }

    const enrollments = await ctx.db
      .query("academicRecords")
      .withIndex("by_courseCode", (q) => q.eq("courseCode", args.courseCode))
      .collect();

    const results = [];
    for (const en of enrollments) {
      const student = await ctx.db.get(en.studentId);
      if (student) {
        const studentUser = await ctx.db.get(student.userId);
        results.push({
          recordId: en._id,
          studentId: student._id,
          rollNumber: student.rollNumber,
          name: studentUser?.name || "Unknown Student",
          attendanceScore: en.attendanceScore ?? 0,
          presentationScore: en.presentationScore ?? 0,
          testScore: en.testScore ?? 0,
          examScore: en.examScore ?? 0,
          totalScore: en.totalScore ?? 0,
          grade: en.grade || "N/A",
          status: en.status,
          isLocked: en.isLocked ?? false,
        });
      }
    }
    return results;
  },
});

// ─────────────────────────────────────────────────────────────────
// [LECTURER] Submit and lock grades for a student's course
// ─────────────────────────────────────────────────────────────────
export const submitLecturerMarks = mutation({
  args: {
    requesterId: v.id("users"),
    recordId: v.id("academicRecords"),
    attendanceScore: v.number(),
    presentationScore: v.number(),
    testScore: v.number(),
    examScore: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || user.role !== "lecturer") {
      throw new ConvexError("Access Denied: Lecturers only.");
    }

    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Academic record not found.");
    if (record.isLocked) {
      throw new ConvexError("This record is locked. You must submit a Grade Correction Request to edit it.");
    }

    const total = args.attendanceScore + args.presentationScore + args.testScore + args.examScore;
    let grade = "F";
    if (total >= 80) grade = "A";
    else if (total >= 70) grade = "B";
    else if (total >= 60) grade = "C";
    else if (total >= 50) grade = "D";

    await ctx.db.patch(args.recordId, {
      attendanceScore: args.attendanceScore,
      presentationScore: args.presentationScore,
      testScore: args.testScore,
      examScore: args.examScore,
      totalScore: total,
      grade: grade,
      status: "Completed",
      isLocked: true, // Grade is now officially locked!
    });

    await ctx.db.insert("academicAuditLogs", {
      actorId: args.requesterId,
      studentId: record.studentId,
      action: "grade_change",
      details: `Lecturer locked scores for ${record.courseCode}. Score: ${total} (${grade}). CA: Att=${args.attendanceScore}, Pres=${args.presentationScore}, Test=${args.testScore}, Exam=${args.examScore}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [LECTURER] Create a Grade Correction Request for locked grades
// ─────────────────────────────────────────────────────────────────
export const createGradeCorrectionRequest = mutation({
  args: {
    requesterId: v.id("users"),
    recordId: v.id("academicRecords"),
    attendanceScore: v.number(),
    presentationScore: v.number(),
    testScore: v.number(),
    examScore: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || user.role !== "lecturer") {
      throw new ConvexError("Access Denied: Lecturers only.");
    }

    const record = await ctx.db.get(args.recordId);
    if (!record) throw new ConvexError("Academic record not found.");

    const student = await ctx.db.get(record.studentId);
    if (!student) throw new ConvexError("Student not found.");
    const studentUser = await ctx.db.get(student.userId);

    const total = args.attendanceScore + args.presentationScore + args.testScore + args.examScore;
    let grade = "F";
    if (total >= 80) grade = "A";
    else if (total >= 70) grade = "B";
    else if (total >= 60) grade = "C";
    else if (total >= 50) grade = "D";

    await ctx.db.insert("gradeCorrectionRequests", {
      lecturerId: args.requesterId,
      recordId: args.recordId,
      studentName: studentUser?.name || "Unknown Student",
      courseCode: record.courseCode,
      proposedAttendance: args.attendanceScore,
      proposedPresentation: args.presentationScore,
      proposedTest: args.testScore,
      proposedExam: args.examScore,
      proposedGrade: grade,
      reason: args.reason,
      status: "pending",
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY + ADMIN] List pending grade correction requests
// ─────────────────────────────────────────────────────────────────
export const listPendingCorrectionRequests = query({
  args: { requesterId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || (user.role !== "registry" && user.role !== "admin")) {
      throw new ConvexError("Access Denied: Registry or Admin only.");
    }

    const requests = await ctx.db
      .query("gradeCorrectionRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const results = [];
    for (const req of requests) {
      const lecturer = await ctx.db.get(req.lecturerId);
      const originalRecord = await ctx.db.get(req.recordId);
      results.push({
        ...req,
        lecturerName: lecturer?.name || "Unknown Lecturer",
        originalAttendance: originalRecord?.attendanceScore ?? 0,
        originalPresentation: originalRecord?.presentationScore ?? 0,
        originalTest: originalRecord?.testScore ?? 0,
        originalExam: originalRecord?.examScore ?? 0,
        originalGrade: originalRecord?.grade || "N/A",
      });
    }
    return results;
  },
});

// ─────────────────────────────────────────────────────────────────
// [REGISTRY + ADMIN] Approve or Reject a Grade Correction Request
// ─────────────────────────────────────────────────────────────────
export const processCorrectionRequest = mutation({
  args: {
    requesterId: v.id("users"),
    requestId: v.id("gradeCorrectionRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || (user.role !== "registry" && user.role !== "admin")) {
      throw new ConvexError("Access Denied: Registry or Admin only.");
    }

    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError("Correction request not found.");

    await ctx.db.patch(args.requestId, { status: args.status });

    if (args.status === "approved") {
      const record = await ctx.db.get(req.recordId);
      if (!record) throw new ConvexError("Target academic record not found.");

      const oldScore = record.totalScore ?? 0;
      const oldGrade = record.grade || "N/A";
      const total = req.proposedAttendance + req.proposedPresentation + req.proposedTest + req.proposedExam;

      await ctx.db.patch(req.recordId, {
        attendanceScore: req.proposedAttendance,
        presentationScore: req.proposedPresentation,
        testScore: req.proposedTest,
        examScore: req.proposedExam,
        totalScore: total,
        grade: req.proposedGrade,
        status: "Completed",
        isLocked: true,
      });

      await ctx.db.insert("academicAuditLogs", {
        actorId: args.requesterId,
        studentId: record.studentId,
        action: "grade_change",
        details: `Approved Grade Correction Request. Course: ${req.courseCode}. Score updated from ${oldScore} (${oldGrade}) to ${total} (${req.proposedGrade}). Reason: ${req.reason}`,
        timestamp: Date.now(),
      });
    }

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [LECTURER] Enroll a student in a course
// ─────────────────────────────────────────────────────────────────
export const enrollStudentInCourse = mutation({
  args: {
    requesterId: v.id("users"),
    courseCode: v.string(),
    courseName: v.string(),
    studentId: v.id("students"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || user.role !== "lecturer") {
      throw new ConvexError("Access Denied: Lecturers only.");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new ConvexError("Student not found.");

    const existing = await ctx.db
      .query("academicRecords")
      .withIndex("by_studentId", (q) => q.eq("studentId", args.studentId))
      .collect();
    const alreadyEnrolled = existing.some((r) => r.courseCode === args.courseCode);
    if (alreadyEnrolled) {
      throw new ConvexError("Student is already enrolled in this course.");
    }

    await ctx.db.insert("academicRecords", {
      studentId: args.studentId,
      courseCode: args.courseCode,
      courseName: args.courseName,
      semester: student.semester,
      attendanceScore: 0,
      presentationScore: 0,
      testScore: 0,
      examScore: 0,
      totalScore: 0,
      grade: "F",
      status: "Enrolled",
      isLocked: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert("academicAuditLogs", {
      actorId: args.requesterId,
      studentId: args.studentId,
      action: "course_status_change",
      details: `Lecturer enrolled student in course ${args.courseCode}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────
// [LECTURER] Create/Upload an Assignment or Project
// ─────────────────────────────────────────────────────────────────
export const createAssignment = mutation({
  args: {
    requesterId: v.id("users"),
    courseCode: v.string(),
    title: v.string(),
    description: v.string(),
    fileBase64: v.optional(v.string()),
    fileName: v.optional(v.string()),
    dueDate: v.string(),
    type: v.union(v.literal("Assignment"), v.literal("Project")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user || user.role !== "lecturer") {
      throw new ConvexError("Access Denied: Lecturers only.");
    }

    const id = await ctx.db.insert("assignments", {
      lecturerId: args.requesterId,
      courseCode: args.courseCode,
      title: args.title,
      description: args.description,
      fileBase64: args.fileBase64,
      fileName: args.fileName,
      dueDate: args.dueDate,
      type: args.type,
      createdAt: Date.now(),
    });

    return { success: true, assignmentId: id };
  },
});

// ─────────────────────────────────────────────────────────────────
// [LECTURER + STUDENT] List Assignments for a course code
// ─────────────────────────────────────────────────────────────────
export const listAssignments = query({
  args: { requesterId: v.id("users"), courseCode: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.requesterId);
    if (!user) throw new ConvexError("Access Denied: Unauthenticated.");

    return await ctx.db
      .query("assignments")
      .withIndex("by_courseCode", (q) => q.eq("courseCode", args.courseCode))
      .collect();
  },
});
