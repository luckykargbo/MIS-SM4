'use client';

import { 
  Users, Search, Filter, BookOpen, 
  GraduationCap, Download, SlidersHorizontal, ArrowUpDown,
  Plus, X, Trash2, Eye, EyeOff, CheckCircle2, AlertTriangle,
  ChevronRight, FileText, Award, Clock, BookOpenCheck
} from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useState } from 'react';
import MaskedData from '../ui/MaskedData';
import { printAttendanceList, printExamSlip, getUniqueCode } from './PrintTemplates';

// ─── Course catalog (pre-defined courses by program) ──────────
const COURSE_CATALOG = {
  "Bachelor of Information Technology": [
    { code: "IT101", name: "Introduction to Programming" },
    { code: "IT102", name: "Computer Architecture" },
    { code: "IT201", name: "Database Management Systems" },
    { code: "IT202", name: "Web Development" },
    { code: "IT301", name: "Software Engineering" },
    { code: "IT302", name: "Network Security" },
    { code: "IT303", name: "Data Structures & Algorithms" },
    { code: "IT401", name: "Cloud Computing" },
    { code: "IT402", name: "Artificial Intelligence" },
    { code: "IT403", name: "Capstone Project" },
  ],
  "Bachelor of Software Engineering Multimedia": [
    { code: "IT101", name: "Introduction to Programming" },
    { code: "IT102", name: "Computer Architecture" },
    { code: "IT201", name: "Database Management Systems" },
    { code: "IT202", name: "Web Development" },
    { code: "IT301", name: "Software Engineering" },
    { code: "IT302", name: "Network Security" },
    { code: "IT303", name: "Data Structures & Algorithms" },
    { code: "IT401", name: "Cloud Computing" },
    { code: "IT402", name: "Artificial Intelligence" },
    { code: "IT403", name: "Capstone Project" },
  ],
  "Bachelor of Information and Communication Technology": [
    { code: "IT101", name: "Introduction to Programming" },
    { code: "IT102", name: "Computer Architecture" },
    { code: "IT201", name: "Database Management Systems" },
    { code: "IT202", name: "Web Development" },
    { code: "IT301", name: "Software Engineering" },
    { code: "IT302", name: "Network Security" },
    { code: "IT303", name: "Data Structures & Algorithms" },
    { code: "IT401", name: "Cloud Computing" },
    { code: "IT402", name: "Artificial Intelligence" },
    { code: "IT403", name: "Capstone Project" },
  ],
  "Diploma in Information Technology": [
    { code: "IT101", name: "Introduction to Programming" },
    { code: "IT102", name: "Computer Architecture" },
    { code: "IT201", name: "Database Management Systems" },
    { code: "IT202", name: "Web Development" },
  ],
  "Certificate in Information Technology": [
    { code: "IT101", name: "Introduction to Programming" },
    { code: "IT102", name: "Computer Architecture" },
  ],
  "Bachelor of Business in International Business": [
    { code: "BBA101", name: "Principles of Management" },
    { code: "BBA102", name: "Financial Accounting" },
    { code: "BBA201", name: "Marketing Management" },
    { code: "BBA202", name: "Business Law" },
    { code: "BBA301", name: "Strategic Management" },
    { code: "BBA302", name: "Entrepreneurship" },
    { code: "BBA401", name: "International Business" },
    { code: "BBA402", name: "Capstone Project" },
  ],
  "Diploma in International Business": [
    { code: "BBA101", name: "Principles of Management" },
    { code: "BBA102", name: "Financial Accounting" },
    { code: "BBA201", name: "Marketing Management" },
    { code: "BBA202", name: "Business Law" },
  ],
  "Bachelor of Arts in Broadcast Journalism": [
    { code: "MC101", name: "Introduction to Mass Communication" },
    { code: "MC102", name: "Media Writing" },
    { code: "MC201", name: "Broadcast Journalism" },
    { code: "MC202", name: "Digital Media Production" },
    { code: "MC301", name: "Public Relations" },
    { code: "MC302", name: "Media Ethics & Law" },
    { code: "MC401", name: "Capstone Project" },
  ],
  "Bachelor of Science in Architecture": [
    { code: "ARC101", name: "Design Fundamentals" },
    { code: "ARC102", name: "Architectural Drawing" },
    { code: "ARC201", name: "Building Construction" },
    { code: "ARC202", name: "Environmental Design" },
    { code: "ARC301", name: "Urban Planning" },
    { code: "ARC302", name: "Structural Engineering" },
    { code: "ARC401", name: "Capstone Project" },
  ],
};

const VALID_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];

// ─── Status badge colors ─────────────────────────────────────
function StatusBadge({ status }) {
  const colors = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
    graduated: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    deferred: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Enrolled: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Deferred: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${colors[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      {status}
    </span>
  );
}

// ─── Grade badge colors ──────────────────────────────────────
function GradeBadge({ grade }) {
  if (!grade) return <span className="text-xs text-slate-600 italic">—</span>;
  const color = grade.startsWith('A') ? 'text-emerald-400' :
                grade.startsWith('B') ? 'text-blue-400' :
                grade.startsWith('C') ? 'text-amber-400' :
                grade === 'D' ? 'text-orange-400' : 'text-red-400';
  return <span className={`text-sm font-black ${color}`}>{grade}</span>;
}

// ═══════════════════════════════════════════════════════════════
// ACADEMIC DETAILS MODAL
// ═══════════════════════════════════════════════════════════════
function AcademicDetailsModal({ student, user, onClose }) {
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [gradingRecord, setGradingRecord] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requesterId = user._id || user.userId;

  const academicRecords = useQuery(api.students.getStudentAcademicRecords, {
    requesterId,
    studentId: student._id,
  });

  const enrollCourse = useMutation(api.students.enrollCourse);
  const removeCourse = useMutation(api.students.removeCourse);
  const assignGrade = useMutation(api.students.assignGrade);
  const updateCourseStatus = useMutation(api.students.updateCourseStatus);
  const updateExamStatus = useMutation(api.students.updateExamStatus);
  const updateProfile = useMutation(api.students.updateStudentProfile);

  // Get available courses for this student's program
  const programCourses = COURSE_CATALOG[student.program] || [];
  const enrolledCodes = academicRecords?.map(r => r.courseCode) || [];
  const availableCourses = programCourses.filter(c => !enrolledCodes.includes(c.code));

  const handleEnroll = async () => {
    if (!selectedCourse) return;
    const course = programCourses.find(c => c.code === selectedCourse);
    if (!course) return;

    setIsSubmitting(true);
    try {
      await enrollCourse({
        requesterId,
        studentId: student._id,
        courseName: course.name,
        courseCode: course.code,
      });
      setSelectedCourse('');
      setShowEnrollForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to enroll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (recordId) => {
    if (!confirm('Remove this course enrollment?')) return;
    try {
      await removeCourse({ requesterId, recordId });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const handleGrade = async () => {
    if (!gradingRecord || !selectedGrade) return;
    setIsSubmitting(true);
    try {
      await assignGrade({
        requesterId,
        recordId: gradingRecord._id,
        grade: selectedGrade,
      });
      setGradingRecord(null);
      setSelectedGrade('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign grade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDefer = async (recordId) => {
    try {
      await updateCourseStatus({ requesterId, recordId, status: 'Deferred' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleReEnroll = async (recordId) => {
    try {
      await updateCourseStatus({ requesterId, recordId, status: 'Enrolled' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const enrolledCount = academicRecords?.filter(r => r.status === 'Enrolled').length || 0;
  const deferredMidtermsCount = academicRecords?.filter(r => r.midtermStatus === 'Deferred').length || 0;
  const deferredFinalsCount = academicRecords?.filter(r => r.finalStatus === 'Deferred').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center border border-blue-500/20">
              <GraduationCap className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1 text-xs text-slate-500">
                <span className="font-mono">{student.rollNumber} · {student.program}</span>
                <span className="text-slate-700 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Gender:</span>
                  <select
                    value={student.gender || ''}
                    onChange={async (e) => {
                      try {
                        await updateProfile({
                          requesterId,
                          studentId: student._id,
                          gender: e.target.value,
                        });
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'Failed to update gender');
                      }
                    }}
                    className="bg-slate-850 border border-slate-750 text-[11px] text-white rounded px-2 py-0.5 outline-none focus:border-blue-500 cursor-pointer font-bold"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-800/50 flex-shrink-0">
          <div className="bg-sky-500/5 border border-sky-500/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-sky-400">{enrolledCount}</p>
            <p className="text-[10px] text-sky-500/70 font-bold uppercase tracking-widest mt-1">Enrolled Courses</p>
          </div>
          <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-400">{deferredMidtermsCount}</p>
            <p className="text-[10px] text-orange-500/70 font-bold uppercase tracking-widest mt-1">Deferred Midterms</p>
          </div>
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-rose-400">{deferredFinalsCount}</p>
            <p className="text-[10px] text-rose-500/70 font-bold uppercase tracking-widest mt-1">Deferred Finals</p>
          </div>
        </div>

        {/* Course List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {/* Enroll Button */}
          {!showEnrollForm && availableCourses.length > 0 && (
            <button
              onClick={() => setShowEnrollForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-bold py-3 rounded-2xl transition-all"
            >
              <Plus className="w-4 h-4" /> Enroll in New Course
            </button>
          )}

          {/* Enroll Form */}
          {showEnrollForm && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BookOpenCheck className="w-4 h-4 text-blue-400" /> Enroll in Course
                </h3>
                <button onClick={() => setShowEnrollForm(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50"
              >
                <option value="">Select a course...</option>
                {availableCourses.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
              <button
                onClick={handleEnroll}
                disabled={!selectedCourse || isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold py-3 rounded-xl transition-all"
              >
                {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
              </button>
            </div>
          )}

          {/* Grade Assignment Modal */}
          {gradingRecord && (
            <div className="bg-slate-800/50 border border-violet-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="w-4 h-4 text-violet-400" /> Assign Grade — {gradingRecord.courseCode}
                </h3>
                <button onClick={() => { setGradingRecord(null); setSelectedGrade(''); }} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400">{gradingRecord.courseName}</p>
              <div className="flex flex-wrap gap-2">
                {VALID_GRADES.map(g => (
                  <button
                    key={g}
                    onClick={() => setSelectedGrade(g)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedGrade === g
                        ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                        : 'bg-slate-900/50 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <button
                onClick={handleGrade}
                disabled={!selectedGrade || isSubmitting}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold py-3 rounded-xl transition-all"
              >
                {isSubmitting ? 'Saving...' : `Assign Grade: ${selectedGrade || '...'}`}
              </button>
            </div>
          )}

          {/* Records List */}
          {academicRecords?.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No courses enrolled yet.</p>
              <p className="text-xs mt-1 text-slate-600">Use the button above to enroll this student in courses.</p>
            </div>
          )}

          {academicRecords?.map((record) => (
            <div
              key={record._id}
              className="bg-slate-800/30 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 hover:bg-slate-800/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0 border border-slate-700">
                    <span className="text-[10px] font-black text-slate-400">{record.courseCode.slice(0, 3)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{record.courseName}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{record.courseCode}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={record.status} />
                  <GradeBadge grade={record.grade} />

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {record.status === 'Enrolled' && (
                      <>
                        <button
                          onClick={() => { setGradingRecord(record); setSelectedGrade(''); }}
                          title="Assign Grade"
                          className="w-8 h-8 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 flex items-center justify-center transition-colors"
                        >
                          <Award className="w-3.5 h-3.5 text-violet-400" />
                        </button>
                        <button
                          onClick={() => handleDefer(record._id)}
                          title="Defer Course"
                          className="w-8 h-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 flex items-center justify-center transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                        <button
                          onClick={() => handleRemove(record._id)}
                          title="Remove Enrollment"
                          className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </>
                    )}
                    {record.status === 'Deferred' && (
                      <button
                        onClick={() => handleReEnroll(record._id)}
                        title="Re-Enroll"
                        className="w-8 h-8 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 flex items-center justify-center transition-colors"
                      >
                        <BookOpenCheck className="w-3.5 h-3.5 text-sky-400" />
                      </button>
                    )}
                    {record.status === 'Completed' && (
                      <button
                        onClick={() => { setGradingRecord(record); setSelectedGrade(record.grade || ''); }}
                        title="Update Grade"
                        className="w-8 h-8 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 flex items-center justify-center transition-colors"
                      >
                        <Award className="w-3.5 h-3.5 text-violet-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Exam Status Row */}
              <div className="flex items-center gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Midterm Exam:</span>
                    <select
                      value={record.midtermStatus || 'Normal'}
                      onChange={async (e) => {
                        try {
                          await updateExamStatus({
                            requesterId,
                            recordId: record._id,
                            type: 'midterm',
                            status: e.target.value,
                          });
                        } catch (err) {
                          alert(err instanceof Error ? err.message : 'Failed to update exam status');
                        }
                      }}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none border bg-slate-950/45 ${
                        (record.midtermStatus || 'Normal') === 'Deferred'
                          ? 'text-orange-400 border-orange-500/30'
                          : (record.midtermStatus || 'Normal') === 'Completed'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : 'text-slate-400 border-slate-700'
                      }`}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Deferred">Deferred</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Final Exam:</span>
                    <select
                      value={record.finalStatus || 'Normal'}
                      onChange={async (e) => {
                        try {
                          await updateExamStatus({
                            requesterId,
                            recordId: record._id,
                            type: 'final',
                            status: e.target.value,
                          });
                        } catch (err) {
                          alert(err instanceof Error ? err.message : 'Failed to update exam status');
                        }
                      }}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none border bg-slate-950/45 ${
                        (record.finalStatus || 'Normal') === 'Deferred'
                          ? 'text-orange-400 border-orange-500/30'
                          : (record.finalStatus || 'Normal') === 'Completed'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : 'text-slate-400 border-slate-700'
                      }`}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Deferred">Deferred</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!academicRecords && (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-slate-800/20 rounded-2xl h-16 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN REGISTRY PANEL
// ═══════════════════════════════════════════════════════════════
export default function RegistryPanel({ user }) {
  const [activeTab, setActiveTab] = useState('master'); // 'master', 'midterm', 'final'
  const [selectedCourse, setSelectedCourse] = useState('');
  const [faculty, setFaculty] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [semesterFilter, setSemesterFilter] = useState('');
  
  // Pre-print attendance list configuration state
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaForm, setMetaForm] = useState({ date: '', venue: '', invigilator: '', className: '', candidatesPresent: '' });

  const students = useQuery(api.students.listStudents, { 
    requesterId: user._id || user.userId,
    faculty: faculty || undefined,
    academicYear: academicYear || undefined
  });

  const updateStatus = useMutation(api.students.updateStudentStatus);
  const updateTranscriptStatus = useMutation(api.students.updateTranscriptStatus);

  const deferredApps = useQuery(api.students.listDeferredApplications, {
    requesterId: user._id || user.userId
  });
  const updateDeferredStatus = useMutation(api.students.updateDeferredApplicationStatus);

  const handleUpdateDeferredStatus = async (appId, status) => {
    const message = prompt(`Enter optional comments/reason to send to the student's portal and email for this ${status} application:`);
    if (message === null) return; // User clicked cancel

    try {
      await updateDeferredStatus({
        requesterId: user._id || user.userId,
        applicationId: appId,
        status: status,
        message: message.trim() || undefined
      });
      alert(`Deferred application successfully ${status}! Student has been notified via portal and email.`);
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const faculties = [
    "Faculty of Information Technology", 
    "Faculty of Business Administration", 
    "Faculty of Media & Communication", 
    "Faculty of Architecture & Design"
  ];
  const years = ["2024/2025", "2025/2026", "2026/2027"];

  // 1. Gather all enrolled courses dynamically from students in selection (filtered by semester)
  const enrolledCoursesList = [];
  const seenCodes = new Set();
  const baseStudents = students || [];

  baseStudents.forEach(s => {
    // Filter courses dropdown dynamically by the semester filter
    const matchesSemester = !semesterFilter ? true : s.semester === parseInt(semesterFilter);
    if (!matchesSemester) return;

    s.academicRecords?.forEach(r => {
      if (!seenCodes.has(r.courseCode)) {
        seenCodes.add(r.courseCode);
        enrolledCoursesList.push({
          courseCode: r.courseCode,
          courseName: r.courseName,
        });
      }
    });
  });

  // 2. Filter students based on current search, semester filter, other filters, and active tab
  const filteredStudents = baseStudents.filter(s => {
    // Semester filter
    const matchesSemester = !semesterFilter ? true : s.semester === parseInt(semesterFilter);
    if (!matchesSemester) return false;

    const matchesSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.program.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'master') return true;

    if (!selectedCourse) return false;

    // Must be enrolled in selected course and cleared for this exam type
    const record = s.academicRecords?.find(r => r.courseCode === selectedCourse);
    if (!record) return false;

    if (activeTab === 'midterm') {
      return record.midtermStatus === 'Normal' || record.midtermStatus === 'Completed';
    } else if (activeTab === 'final') {
      return record.finalStatus === 'Normal' || record.finalStatus === 'Completed';
    }
    return false;
  });

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await updateStatus({
        requesterId: user._id || user.userId,
        studentId,
        registryStatus: newStatus,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleTranscriptToggle = async (studentId, currentStatus) => {
    try {
      await updateTranscriptStatus({
        requesterId: user._id || user.userId,
        studentId,
        transcriptRemoved: !currentStatus,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update transcript status');
    }
  };

  const handleExportCSV = () => {
    // Generate simple CSV of Master Ledger
    const headers = ["Student Name", "Roll Number", "Program", "Faculty", "Academic Year", "Semester", "Status"];
    const rows = filteredStudents.map(s => [
      s.name,
      s.rollNumber,
      s.program,
      s.faculty,
      s.academicYear,
      `Semester ${s.semester}`,
      s.registryStatus
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Enrollment_Ledger_${academicYear || 'Global'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAttendanceList = (e) => {
    e.preventDefault();
    const courseObj = enrolledCoursesList.find(c => c.courseCode === selectedCourse);
    if (!courseObj) return;

    // Only include candidates who are financially cleared
    const eligibleStudents = filteredStudents.filter(s => s.isFinanciallyCleared);

    if (eligibleStudents.length === 0) {
      alert("No financially cleared candidates are eligible to export for this exam module.");
      return;
    }

    printAttendanceList(courseObj, eligibleStudents, metaForm);
    setMetaModalOpen(false);
  };

  // Summary stats
  const totalStudents = students?.length || 0;
  const activeStudents = students?.filter(s => s.registryStatus === 'active').length || 0;
  const graduatedStudents = students?.filter(s => s.registryStatus === 'graduated').length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Enrolled</p>
          </div>
          <p className="text-3xl font-black text-white">{totalStudents}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active Students</p>
          </div>
          <p className="text-3xl font-black text-white">{activeStudents}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-violet-500" />
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Graduated</p>
          </div>
          <p className="text-3xl font-black text-white">{graduatedStudents}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => { setActiveTab('master'); setSelectedCourse(''); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'master'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Master Ledger
        </button>
        <button
          onClick={() => { setActiveTab('midterm'); setSelectedCourse(''); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'midterm'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Midterm Exam Slips
        </button>
        <button
          onClick={() => { setActiveTab('final'); setSelectedCourse(''); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'final'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Final Exam Slips
        </button>
        <button
          onClick={() => { setActiveTab('deferred'); setSelectedCourse(''); }}
          className={`px-5 py-3 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'deferred'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Deferred Applications
        </button>
      </div>

      {/* Filtering Header */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, Roll No..." 
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-sans"
            />
          </div>

          {/* Department / Faculty dropdown */}
          <select 
            value={faculty}
            onChange={(e) => {
              setFaculty(e.target.value);
              setSelectedCourse(''); // reset selected course on filter change
            }}
            className="bg-slate-950/50 border border-slate-800 rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50 font-bold"
          >
            <option value="">All Departments</option>
            {faculties.map(f => <option key={f} value={f}>{f}</option>)}
          </select>

          {/* Semester filter dropdown */}
          <select 
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setSelectedCourse(''); // reset selected course on filter change
            }}
            className="bg-slate-950/50 border border-slate-800 rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50 font-bold"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
              <option key={sem} value={sem.toString()}>Semester {sem}</option>
            ))}
          </select>

          {/* Enrollment Year dropdown */}
          <select 
            value={academicYear}
            onChange={(e) => {
              setAcademicYear(e.target.value);
              setSelectedCourse(''); // reset selected course on filter change
            }}
            className="bg-slate-950/50 border border-slate-800 rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50 font-bold"
          >
            <option value="">Enrollment Year</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Selected Course dropdown - Only visible for Exam Slips tabs */}
        {(activeTab === 'midterm' || activeTab === 'final') && (
          <div className="w-full">
            <select 
              value={selectedCourse}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCourse(val);
                
                const selectedSemText = semesterFilter ? `SEMESTER ${semesterFilter}` : "ALL SEMESTERS";
                const selectedFacultyText = faculty ? (faculty.replace("Faculty of ", "")) : "GENERAL";
                
                setMetaForm(prev => ({
                  ...prev,
                  className: val ? `${selectedFacultyText} / ${selectedSemText}`.toUpperCase() : "",
                }));
              }}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50 font-bold font-sans"
            >
              <option value="">Select Exam Course (Module Code)...</option>
              {enrolledCoursesList.map(c => (
                <option key={c.courseCode} value={c.courseCode}>{c.courseCode} — {c.courseName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Registry Record Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                {activeTab === 'master' ? 'Master Enrollment Ledger' : 
                 activeTab === 'midterm' ? 'Midterm Sitting Slips' : 
                 activeTab === 'deferred' ? 'Deferred Exam Applications' : 'Final Sitting Slips'}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                {activeTab === 'master' ? `Academic Year ${academicYear || 'Global'} View` : 
                 activeTab === 'deferred' ? 'List of submitted deferred access form applications' :
                 selectedCourse ? `Cleared Candidates for ${selectedCourse}` : 'Please select a course above'}
              </p>
            </div>
          </div>
          
          {activeTab === 'master' || activeTab === 'deferred' ? (
            activeTab === 'master' ? (
              <button 
                onClick={handleExportCSV}
                disabled={filteredStudents?.length === 0}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-slate-700"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            ) : null
          ) : (
            <button 
              onClick={() => setMetaModalOpen(true)}
              disabled={!selectedCourse || filteredStudents?.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/5 border border-blue-500/10"
            >
              <FileText className="w-4 h-4" /> Export Attendance List (PDF)
            </button>
          )}
        </div>

        {(activeTab === 'midterm' || activeTab === 'final') && !selectedCourse ? (
          <div className="px-6 py-20 text-center text-slate-500 space-y-2">
            <BookOpen className="w-12 h-12 mx-auto opacity-20 text-blue-400" />
            <h3 className="font-bold text-slate-400 text-sm">Select Course to View Slips</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Please choose a course module from the dropdown filter above to inspect eligible students and generate printable attendance sheets or slips.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {activeTab === 'deferred' ? (
                  <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                    <th className="px-6 py-4">Student Name</th>
                    <th className="px-6 py-4">Roll Number</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Modules</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Attached Proof</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                ) : (
                  <tr className="bg-slate-950/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                    <th className="px-6 py-4">{activeTab === 'master' ? 'Student Name' : 'No.'}</th>
                    <th className="px-6 py-4">{activeTab === 'master' ? 'Roll Number' : 'Student ID'}</th>
                    <th className="px-6 py-4">{activeTab === 'master' ? 'Department / Program' : 'Student Name'}</th>
                    <th className="px-6 py-4">{activeTab === 'master' ? 'Enrolled Year' : 'Gender'}</th>
                    <th className="px-6 py-4">{activeTab === 'master' ? 'Sem.' : 'Program / Semester'}</th>
                    {activeTab === 'master' && (
                      <>
                        <th className="px-6 py-4">Finance Status</th>
                        <th className="px-6 py-4">Transcript</th>
                      </>
                    )}
                    <th className="px-6 py-4">{activeTab === 'master' ? 'Status' : 'Sitting Security Code'}</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {activeTab !== 'deferred' && filteredStudents?.length === 0 && (
                  <tr>
                    <td colSpan={activeTab === 'master' ? 9 : 7} className="px-6 py-20 text-center text-slate-500 text-sm italic">
                      No matching student records found for the current selection.
                    </td>
                  </tr>
                )}
                
                {activeTab === 'deferred' ? (
                  deferredApps === undefined ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-20 text-center text-slate-550 text-xs font-bold animate-pulse uppercase tracking-wider">
                        Decrypting deferred applications ledger...
                      </td>
                    </tr>
                  ) : deferredApps.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-20 text-center text-slate-500 text-sm italic">
                        No deferred exam applications found.
                      </td>
                    </tr>
                  ) : deferredApps.map((app) => {
                    let badgeColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
                    if (app.status === "approved") badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    if (app.status === "rejected") badgeColor = "bg-red-500/10 text-red-500 border-red-500/20";

                    return (
                      <tr key={app._id} className="hover:bg-slate-800/20 transition-colors group">
                        <td className="px-6 py-5">
                          <p className="text-xs font-bold text-white">{app.studentName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{app.email}</p>
                          {app.faculty && (
                            <p className="text-[9px] text-slate-400 font-semibold mt-1">
                              {app.faculty} - {app.program} (Sem {app.semester})
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-slate-400">
                          {app.rollNumber}
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-white">{app.category}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-blue-400">{app.modules}</span>
                        </td>
                        <td className="px-6 py-5 max-w-[200px] truncate" title={app.reason}>
                          <span className="text-xs text-slate-350">{app.reason}</span>
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-slate-400">
                          {app.evidenceName || "None"}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badgeColor}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right space-x-2">
                          {app.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdateDeferredStatus(app._id, "approved")}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateDeferredStatus(app._id, "rejected")}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider shadow-sm"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : activeTab === 'master' ? (
                  // MASTER LEDGER TABLE ROWS
                  filteredStudents?.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{s.email}</p>
                      </td>
                      <td className="px-6 py-5">
                        <MaskedData value={s.rollNumber} type="text" />
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-white leading-tight">{s.program}</p>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{s.faculty}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-mono text-slate-400">{s.academicYear}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-blue-400">Y{Math.ceil(s.semester/2)} S{s.semester % 2 || 2}</span>
                      </td>
                      <td className="px-6 py-5">
                        {s.isFinanciallyCleared ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-450 font-bold bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-450" />
                            Verified
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-amber-500/80 font-bold bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10 w-fit">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80" />
                            Pending
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <button 
                          onClick={() => {
                            if (!s.isFinanciallyCleared) {
                              alert("Cannot print or collect transcript: Student has outstanding tuition balances and is not cleared by Finance.");
                              return;
                            }
                            handleTranscriptToggle(s._id, s.transcriptRemoved);
                          }}
                          disabled={!s.isFinanciallyCleared}
                          title={s.isFinanciallyCleared ? "Toggle transcript collection status" : "Blocked: Not cleared by Finance"}
                          className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border transition-all ${
                            !s.isFinanciallyCleared
                              ? "text-slate-500 bg-slate-800/40 border-slate-800 cursor-not-allowed opacity-50"
                              : s.transcriptRemoved 
                              ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20" 
                              : "text-slate-400 bg-slate-800 hover:bg-slate-700 border-slate-700"
                          }`}
                        >
                          {s.transcriptRemoved ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Removed
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-slate-500" />
                              Not Removed
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <select
                          value={s.registryStatus}
                          onChange={(e) => handleStatusChange(s._id, e.target.value)}
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border bg-transparent outline-none cursor-pointer ${
                            s.registryStatus === 'active' ? 'text-emerald-400 border-emerald-500/20' : 
                            s.registryStatus === 'graduated' ? 'text-blue-400 border-blue-500/20' :
                            s.registryStatus === 'suspended' ? 'text-red-400 border-red-500/20' :
                            'text-orange-400 border-orange-500/20'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="graduated">Graduated</option>
                          <option value="deferred">Deferred</option>
                        </select>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20"
                        >
                          <FileText className="w-3.5 h-3.5" /> Academic Records
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  // EXAM SLIPS TABLE ROWS
                  filteredStudents?.map((s, index) => (
                    <tr key={s._id} className="hover:bg-slate-800/20 transition-colors group">
                      <td className="px-6 py-5 text-xs font-bold text-slate-400">{index + 1}</td>
                      <td className="px-6 py-5">
                        <span className="font-mono text-xs font-bold text-white">{s.rollNumber}</span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-white">{s.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{s.email}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                          s.gender?.toLowerCase() === 'female' ? 'text-pink-400' : 
                          s.gender?.toLowerCase() === 'male' ? 'text-sky-400' : 'text-slate-500'
                        }`}>
                          {s.gender || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-semibold text-slate-350 truncate max-w-[200px]" title={s.program}>{s.program}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold text-blue-400 uppercase">Sem {s.semester}</span>
                          <span className="text-slate-600 text-[8px]">•</span>
                          {s.isFinanciallyCleared ? (
                            <span className="text-[9px] font-black text-emerald-450 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase border border-emerald-500/15">Fees Paid</span>
                          ) : (
                            <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded uppercase border border-rose-500/15">Fees Unpaid</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {s.isFinanciallyCleared ? (
                          <span className="font-mono text-xs font-black text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-md">
                            {getUniqueCode(s.rollNumber)}
                          </span>
                        ) : (
                          <span className="font-mono text-xs font-black text-rose-455 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            Blocked
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => {
                            if (!s.isFinanciallyCleared) {
                              alert("Cannot print sitting slip: Student has outstanding tuition fees for this semester.");
                              return;
                            }
                            printExamSlip(s, s.academicRecords, activeTab);
                          }}
                          disabled={!s.isFinanciallyCleared}
                          title={s.isFinanciallyCleared ? "Print sitting slip" : "Blocked: Outstanding Tuition Fees"}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                            s.isFinanciallyCleared 
                              ? "text-emerald-400 hover:text-emerald-350 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 cursor-pointer"
                              : "text-slate-500 bg-slate-800/40 border-slate-800 cursor-not-allowed opacity-50"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" /> Print Slip
                        </button>
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-750 px-2.5 py-1.5 rounded-lg border border-slate-700"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                
                {!students && (
                  [1,2,3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="7" className="px-6 py-8 bg-slate-800/5"></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pre-print Configuration Modal */}
      {metaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form 
            onSubmit={handlePrintAttendanceList}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-md flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Configure Attendance List
              </h3>
              <button 
                type="button" 
                onClick={() => setMetaModalOpen(false)} 
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Candidates Clearance Summary Block */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-white">Candidates Clearance Summary</p>
                <p className="text-slate-400 mt-1">
                  Out of <span className="font-bold text-white">{filteredStudents.length}</span> total candidates, 
                  <span className="font-bold text-emerald-400"> {filteredStudents.filter(s => s.isFinanciallyCleared).length}</span> are financially cleared for this semester and will be exported.
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date of Examination</label>
                <input 
                  type="date"
                  required
                  value={metaForm.date}
                  onChange={e => setMetaForm({ ...metaForm, date: e.target.value })}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class / Program Name</label>
                <input 
                  type="text"
                  required
                  value={metaForm.className}
                  onChange={e => setMetaForm({ ...metaForm, className: e.target.value })}
                  placeholder="e.g. BBIT 1201F/ SEMESTER 2"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Exam Venue</label>
                <input 
                  type="text"
                  required
                  value={metaForm.venue}
                  onChange={e => setMetaForm({ ...metaForm, venue: e.target.value })}
                  placeholder="e.g. Hall A, Main Block"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invigilator Name</label>
                <input 
                  type="text"
                  required
                  value={metaForm.invigilator}
                  onChange={e => setMetaForm({ ...metaForm, invigilator: e.target.value })}
                  placeholder="e.g. Dr. John Kamara"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-3 rounded-xl mt-4 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> Generate Printable PDF
            </button>
          </form>
        </div>
      )}

      {/* Academic Details Modal */}
      {selectedStudent && (
        <AcademicDetailsModal
          student={selectedStudent}
          user={user}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
