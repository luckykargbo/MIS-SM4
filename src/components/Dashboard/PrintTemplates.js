// Helper function to calculate a stable unique check-in code for a student
export function getUniqueCode(rollNumber) {
  // Simple deterministic hash function to generate an 8-character hex-like unique code
  let hash = 0;
  for (let i = 0; i < rollNumber.length; i++) {
    hash = rollNumber.charCodeAt(i) + ((hash << 5) - hash);
  }
  const code = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
  return code;
}

export function printAttendanceList(course, students, metadata) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to export the attendance list.");
    return;
  }

  const logoUrl = window.location.origin + '/limkokwing_logo.jpg';
  
  // Calculate gender stats
  const totalStudents = students.length;
  const totalMale = students.filter(s => (s.gender || '').toLowerCase() === 'male').length;
  const totalFemale = students.filter(s => (s.gender || '').toLowerCase() === 'female').length;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Exam Attendance List - ${course.courseCode}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          font-family: Arial, sans-serif;
          color: #000;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.3;
        }
        .header-container {
          text-align: center;
          margin-bottom: 15px;
        }
        .logo {
          max-height: 60px;
          display: block;
          margin: 0 auto 5px auto;
        }
        .university-name {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .campus-location {
          font-size: 10px;
          font-weight: bold;
          margin-top: 2px;
          border-top: 1px solid #000;
          display: inline-block;
          padding-top: 2px;
          width: 150px;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .meta-table td {
          border: 1px solid #000;
          padding: 5px 8px;
          vertical-align: middle;
          font-weight: bold;
        }
        .meta-label {
          font-size: 9px;
          color: #333;
          display: block;
          text-transform: uppercase;
          margin-bottom: 2px;
        }
        .section-title {
          text-align: center;
          font-size: 13px;
          font-weight: bold;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin: 10px 0;
        }
        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        .attendance-table th {
          background-color: #000;
          color: #fff;
          border: 1px solid #000;
          padding: 6px 4px;
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          text-align: left;
        }
        .attendance-table th.center, .attendance-table td.center {
          text-align: center;
        }
        .attendance-table td {
          border: 1px solid #000;
          padding: 5px 6px;
          font-size: 10px;
          vertical-align: middle;
        }
        .col-no {
          background-color: #e0f7fa; /* Cyan background for NO column */
          font-weight: bold;
          width: 25px;
        }
        .col-roll {
          font-family: monospace;
          font-weight: bold;
          width: 90px;
        }
        .col-gender {
          width: 50px;
        }
        .col-code {
          font-family: monospace;
          font-weight: bold;
          width: 80px;
        }
        .col-date, .col-sign {
          width: 80px;
        }
        .red-bar-row td {
          background-color: #ff3333;
          height: 10px;
          padding: 0;
          border: 1px solid #000;
          color: #ff3333;
        }
        .totals-row td {
          font-weight: bold;
          background-color: #f5f5f5;
          border: 1px solid #000;
          padding: 6px;
        }
        .totals-val {
          background-color: #e0f7fa;
        }
        .totals-val-female {
          background-color: #fce4ec;
        }
        .totals-val-total {
          background-color: #eceff1;
        }
        @media print {
          body {
            margin: 0;
          }
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <img class="logo" src="${logoUrl}" alt="Limkokwing University Logo" />
        <div class="university-name">Limkokwing University</div>
        <div class="university-name" style="font-size:11px; margin-top:2px;">Of Creative Technology</div>
        <div class="campus-location">Sierra Leone</div>
      </div>

      <table class="meta-table">
        <tr>
          <td style="width: 30%;">
            <span class="meta-label">Date:</span>
            ${metadata.date || '&nbsp;'}
          </td>
          <td style="width: 30%;">
            <span class="meta-label">Module Code:</span>
            ${course.courseCode}
          </td>
          <td style="width: 40%;">
            <span class="meta-label">Title of Examination:</span>
            ${course.courseName}
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <span class="meta-label">Class / Program / Semester:</span>
            ${metadata.className || '&nbsp;'}
          </td>
          <td>
            <span class="meta-label">No. of Candidates Present:</span>
            ${metadata.candidatesPresent || totalStudents}
          </td>
        </tr>
        <tr>
          <td>
            <span class="meta-label">Venue:</span>
            ${metadata.venue || '&nbsp;'}
          </td>
          <td>
            <span class="meta-label">Invigilator:</span>
            ${metadata.invigilator || '&nbsp;'}
          </td>
          <td>
            <span class="meta-label">Sig:</span>
            &nbsp;
          </td>
        </tr>
      </table>

      <div class="section-title">Attendance List</div>

      <table class="attendance-table">
        <thead>
          <tr>
            <th class="center" style="width: 30px;">No.</th>
            <th style="width: 100px;">Student ID</th>
            <th>Name</th>
            <th class="center" style="width: 60px;">Gender</th>
            <th class="center" style="width: 90px;">Unique Code</th>
            <th style="width: 90px;">Date</th>
            <th style="width: 90px;">Sign</th>
          </tr>
        </thead>
        <tbody>
          ${students.map((student, index) => `
            <tr>
              <td class="center col-no">${index + 1}</td>
              <td class="col-roll">${student.rollNumber}</td>
              <td style="font-weight: bold;">${student.name}</td>
              <td class="center col-gender" style="color: ${student.gender?.toLowerCase() === 'female' ? '#d81b60' : '#0288d1'}; font-weight: bold;">
                ${student.gender || '—'}
              </td>
              <td class="center col-code">${getUniqueCode(student.rollNumber)}</td>
              <td class="col-date"></td>
              <td class="col-sign"></td>
            </tr>
          `).join('')}
          <tr class="red-bar-row">
            <td>?</td>
            <td></td>
            <td></td>
            <td></td>
            <td class="center">?</td>
            <td></td>
            <td></td>
          </tr>
          <tr class="totals-row">
            <td class="center">TOTAL</td>
            <td>TOTAL MALE</td>
            <td class="totals-val center" style="width: 50px;">${totalMale}</td>
            <td class="center">TOTAL FEMALE</td>
            <td class="totals-val-female center" style="width: 50px;">${totalFemale}</td>
            <td class="center">GRAND TOTAL</td>
            <td class="totals-val-total center">${totalStudents}</td>
          </tr>
        </tbody>
      </table>

      <script>
        window.onload = function() {
          // Wait a brief moment for assets/images to load then print
          setTimeout(function() {
            window.print();
            window.close();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printExamSlip(student, academicRecords, examType) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to print the exam slip.");
    return;
  }

  const logoUrl = window.location.origin + '/limkokwing_logo.jpg';
  const typeLabel = examType === 'midterm' ? 'Midterm Examination' : 'Final Examination';
  
  // Filter courses that are cleared (status is Normal or Completed for this exam type)
  const clearedCourses = academicRecords.filter(r => {
    const status = examType === 'midterm' ? r.midtermStatus : r.finalStatus;
    return status === 'Normal' || status === 'Completed';
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Exam Sitting Slip - ${student.rollNumber}</title>
      <style>
        @page {
          size: A5 landscape;
          margin: 10mm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #000;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .slip-container {
          border: 2px solid #000;
          border-radius: 12px;
          padding: 15px;
          position: relative;
          background-color: #fff;
          box-sizing: border-box;
          min-height: 125mm; /* fits A5 landscape */
        }
        .header-layout {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-b: 1px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .logo-block {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo {
          max-height: 45px;
        }
        .title-block {
          text-align: right;
        }
        .univ-name {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .slip-title {
          font-size: 14px;
          font-weight: bold;
          color: #000;
          margin-top: 3px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 12px;
          background-color: #f9f9f9;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #eee;
        }
        .meta-item {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dashed #ddd;
          padding-bottom: 2px;
        }
        .meta-label {
          font-weight: bold;
          color: #555;
        }
        .meta-val {
          font-weight: bold;
          color: #000;
          font-family: monospace;
        }
        .courses-title {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          color: #333;
          border-bottom: 2px solid #000;
          padding-bottom: 2px;
        }
        .courses-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .courses-table th {
          font-size: 9px;
          font-weight: bold;
          background-color: #f0f0f0;
          border: 1px solid #ddd;
          padding: 4px 6px;
          text-align: left;
        }
        .courses-table td {
          border: 1px solid #ddd;
          padding: 5px 6px;
          font-size: 10px;
        }
        .code-display {
          font-family: monospace;
          font-weight: bold;
        }
        .security-badge {
          border: 2px dashed #0288d1;
          border-radius: 8px;
          padding: 6px 12px;
          display: inline-block;
          background-color: #e1f5fe;
          text-align: center;
        }
        .security-code {
          font-size: 16px;
          font-family: monospace;
          font-weight: 900;
          color: #0288d1;
          letter-spacing: 1px;
        }
        .footer-layout {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 10px;
        }
        .sig-block {
          border-top: 1px solid #000;
          width: 150px;
          text-align: center;
          font-size: 9px;
          margin-top: 25px;
          padding-top: 3px;
          font-weight: bold;
        }
        .alert-text {
          font-size: 8px;
          color: #ff3333;
          font-weight: bold;
          max-width: 250px;
          line-height: 1.2;
        }
        @media print {
          body {
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="slip-container">
        <div class="header-layout">
          <div class="logo-block">
            <img class="logo" src="${logoUrl}" alt="Limkokwing University Logo" />
            <div>
              <div class="univ-name">Limkokwing University</div>
              <div style="font-size: 8px; font-weight: bold; color: #555;">Sierra Leone Campus</div>
            </div>
          </div>
          <div class="title-block">
            <div class="slip-title">${typeLabel} Slip</div>
            <div style="font-size: 9px; font-weight: bold; color: #666; margin-top: 2px;">Academic Year ${student.academicYear}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Name:</span>
            <span class="meta-val" style="font-family: inherit;">${student.name}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Student ID:</span>
            <span class="meta-val">${student.rollNumber}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Program:</span>
            <span class="meta-val" style="font-family: inherit; font-size: 9px;">${student.program}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Semester:</span>
            <span class="meta-val" style="font-family: inherit;">Semester ${student.semester}</span>
          </div>
        </div>

        <div class="courses-title">Authorized Courses</div>
        <table class="courses-table">
          <thead>
            <tr>
              <th style="width: 80px;">Code</th>
              <th>Course Name</th>
              <th style="width: 80px; text-align: center;">Sitting Status</th>
            </tr>
          </thead>
          <tbody>
            ${clearedCourses.length === 0 ? `
              <tr>
                <td colspan="3" style="text-align: center; color: red; font-weight: bold; padding: 10px;">
                  NO COURSES CLEARED FOR THIS EXAMINATION SESSION.
                </td>
              </tr>
            ` : clearedCourses.map(c => `
              <tr>
                <td class="code-display">${c.courseCode}</td>
                <td style="font-weight: bold;">${c.courseName}</td>
                <td style="text-align: center; font-weight: bold; color: green;">CLEARED</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer-layout">
          <div>
            <div class="security-badge">
              <div style="font-size: 8px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 2px;">Sitting Verification Code</div>
              <div class="security-code">${getUniqueCode(student.rollNumber)}</div>
            </div>
            <div class="alert-text" style="margin-top: 8px;">
              * Present this slip along with your Student ID Card at the exam entrance.
              Any tampering or duplication will result in immediate disqualification.
            </div>
          </div>
          <div>
            <div class="sig-block">
              Registrar / Examination Officer
            </div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printTuitionInvoice(student, finance) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to print the tuition invoice.");
    return;
  }

  const logoUrl = window.location.origin + '/limkokwing_logo.jpg';
  const invoiceNum = `INV-\${student.rollNumber.replace(/\\//g, '-')}`;
  const currentDate = new Date().toLocaleDateString();

  const invoiceLinesHtml = finance.invoiceLines && finance.invoiceLines.length > 0
    ? finance.invoiceLines.map((line, index) => `
        <tr>
          <td class="center col-no">\${index + 1}</td>
          <td>\${line.description}</td>
          <td class="center">\${new Date(line.date).toLocaleDateString()}</td>
          <td class="right font-mono">SLE \${Number(line.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td class="center col-no">1</td>
          <td>Enrollment Tuition Fee</td>
          <td class="center">\${new Date(finance.updatedAt || Date.now()).toLocaleDateString()}</td>
          <td class="right font-mono">SLE \${Number(finance.tuitionFee).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        </tr>
      `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Tuition Invoice - \${student.rollNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .invoice-container {
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          padding: 24px;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          max-height: 55px;
        }
        .univ-name {
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .univ-sub {
          font-size: 9px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .invoice-title-section {
          text-align: right;
        }
        .invoice-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 1px;
        }
        .invoice-number {
          font-size: 10px;
          font-family: monospace;
          font-weight: 700;
          color: #64748b;
          margin-top: 4px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .info-card {
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 12px 16px;
        }
        .card-title {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .info-label {
          color: #64748b;
          font-weight: 600;
        }
        .info-val {
          font-weight: 700;
          color: #0f172a;
        }
        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .invoice-table th {
          background-color: #0f172a;
          color: #fff;
          border: 1px solid #0f172a;
          padding: 8px 10px;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
        }
        .invoice-table th.center, .invoice-table td.center {
          text-align: center;
        }
        .invoice-table th.right, .invoice-table td.right {
          text-align: right;
        }
        .invoice-table td {
          border: 1px solid #e2e8f0;
          padding: 8px 10px;
          font-size: 10px;
        }
        .col-no {
          width: 30px;
          font-weight: bold;
          background-color: #f8fafc;
        }
        .summary-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 24px;
        }
        .summary-table {
          width: 250px;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          font-size: 10px;
        }
        .summary-label {
          font-weight: bold;
          color: #64748b;
        }
        .summary-val {
          text-align: right;
          font-weight: bold;
          font-family: monospace;
          font-size: 11px;
        }
        .total-row {
          background-color: #f1f5f9;
        }
        .total-row td {
          border-top: 2px solid #0f172a;
          border-bottom: 2px double #0f172a;
          font-size: 12px;
          font-weight: 800;
        }
        .status-badge {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 4px 10px;
          border-radius: 6px;
          margin-top: 8px;
        }
        .status-unpaid {
          background-color: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
        }
        .status-paid {
          background-color: #f0fdf4;
          color: #22c55e;
          border: 1px solid #dcfce7;
        }
        .footer-layout {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 30px;
        }
        .instructions {
          max-width: 350px;
          font-size: 8px;
          color: #64748b;
          line-height: 1.3;
        }
        .sig-block {
          border-top: 1px solid #0f172a;
          width: 160px;
          text-align: center;
          font-size: 9px;
          margin-top: 40px;
          padding-top: 4px;
          font-weight: bold;
        }
        @media print {
          body {
            margin: 0;
          }
          .invoice-container {
            border: none;
            box-shadow: none;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header-container">
          <div class="logo-section">
            <img class="logo" src="\${logoUrl}" alt="University Logo" />
            <div>
              <div class="univ-name">Limkokwing University</div>
              <div class="univ-sub">Of Creative Technology · Sierra Leone Campus</div>
            </div>
          </div>
          <div class="invoice-title-section">
            <div class="invoice-title">OFFICIAL INVOICE</div>
            <div class="invoice-number">Invoice No: \${invoiceNum}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="card-title">Student Information</div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-val">\${student.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Student ID:</span>
              <span class="info-val">\${student.rollNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Program:</span>
              <span class="info-val">\${student.program}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Faculty:</span>
              <span class="info-val">\${student.faculty || 'Faculty of Creative Arts'}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="card-title">Billing Metadata</div>
            <div class="info-row">
              <span class="info-label">Billing Date:</span>
              <span class="info-val">\${currentDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Academic Year:</span>
              <span class="info-val">\${finance.academicYear}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Semester:</span>
              <span class="info-val">Semester \${finance.semester}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Status:</span>
              <span class="info-val">
                <span class="status-badge \${finance.isCleared ? 'status-paid' : 'status-unpaid'}">
                  \${finance.isCleared ? 'Cleared' : 'Arrears Detected'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div class="univ-sub" style="font-size: 9px; font-weight: bold; margin-bottom: 6px; letter-spacing: 0.5px;">Account Breakdown</div>
        <table class="invoice-table">
          <thead>
            <tr>
              <th class="center" style="width: 30px;">No.</th>
              <th>Description</th>
              <th class="center" style="width: 100px;">Date</th>
              <th class="right" style="width: 120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            \${invoiceLinesHtml}
          </tbody>
        </table>

        <div class="summary-section">
          <table class="summary-table">
            <tr>
              <td class="summary-label">Total Fee Amount:</td>
              <td class="summary-val">SLE \${Number(finance.tuitionFee).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr>
              <td class="summary-label">Amount Paid to Date:</td>
              <td class="summary-val" style="color: #22c55e;">SLE \${Number(finance.amountPaid).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
            <tr class="total-row">
              <td class="summary-label" style="color: #0f172a;">Outstanding Balance:</td>
              <td class="summary-val" style="color: \${finance.isCleared ? '#22c55e' : '#ef4444'};">
                SLE \${Number(finance.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </td>
            </tr>
          </table>
        </div>

        <div class="footer-layout">
          <div class="instructions">
            <strong>NOTICE &amp; PAYMENT INSTRUCTIONS</strong><br/>
            1. All tuition and fee payments must be processed directly at the Finance Office or through university authorized bank channels.<br/>
            2. Please keep this invoice and the official payment receipt for academic registration verification.<br/>
            3. Outstanding arrears may result in deferred status for midterm and final exams.
          </div>
          <div>
            <div class="sig-block">
              Authorized Finance Officer
            </div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printTuitionReceipt(student, transaction) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to print the tuition receipt.");
    return;
  }

  const logoUrl = window.location.origin + '/limkokwing_logo.jpg';
  const receiptNum = `RCP-${transaction._id.substring(0, 8).toUpperCase()}`;
  const paymentDate = new Date(transaction.timestamp).toLocaleString();
  const uniqueSecCode = getUniqueCode(transaction._id);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Tuition Receipt - ${student.rollNumber}</title>
      <style>
        @page {
          size: A5 landscape;
          margin: 10mm;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .receipt-container {
          border: 2px solid #0f172a;
          border-radius: 16px;
          padding: 20px;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          position: relative;
          min-height: 125mm;
          box-sizing: border-box;
        }
        .header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 12px;
          margin-bottom: 15px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          max-height: 45px;
        }
        .univ-name {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
        }
        .univ-sub {
          font-size: 8px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
        }
        .title-section {
          text-align: right;
        }
        .receipt-title {
          font-size: 16px;
          font-weight: 900;
          color: #10b981;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .receipt-number {
          font-size: 10px;
          font-family: monospace;
          font-weight: 700;
          color: #64748b;
          margin-top: 2px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        .info-card {
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .card-title {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          color: #64748b;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .info-label {
          color: #64748b;
          font-weight: 600;
        }
        .info-val {
          font-weight: 700;
          color: #0f172a;
        }
        .amount-section {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border-radius: 12px;
          padding: 15px;
          text-align: center;
          margin-bottom: 15px;
          box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2);
        }
        .amount-label {
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.9;
        }
        .amount-value {
          font-size: 24px;
          font-weight: 900;
          font-family: monospace;
          margin-top: 4px;
        }
        .footer-layout {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 15px;
        }
        .security-badge {
          border: 2px dashed #10b981;
          border-radius: 8px;
          padding: 4px 10px;
          display: inline-block;
          background-color: #ecfdf5;
          text-align: center;
        }
        .security-code {
          font-size: 14px;
          font-family: monospace;
          font-weight: 900;
          color: #059669;
          letter-spacing: 1px;
        }
        .sig-block {
          border-top: 1px solid #0f172a;
          width: 150px;
          text-align: center;
          font-size: 8px;
          margin-top: 30px;
          padding-top: 4px;
          font-weight: bold;
        }
        @media print {
          body {
            margin: 0;
          }
          .receipt-container {
            border: 2px solid #000;
            box-shadow: none;
            padding: 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header-container">
          <div class="logo-section">
            <img class="logo" src="${logoUrl}" alt="University Logo" />
            <div>
              <div class="univ-name">Limkokwing University</div>
              <div class="univ-sub">Of Creative Technology · Sierra Leone Campus</div>
            </div>
          </div>
          <div class="title-section">
            <div class="receipt-title">Payment Receipt</div>
            <div class="receipt-number">Receipt No: ${receiptNum}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-card">
            <div class="card-title">Student Details</div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-val">${student.name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Student ID:</span>
              <span class="info-val">${student.rollNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Program:</span>
              <span class="info-val">${student.program}</span>
            </div>
          </div>

          <div class="info-card">
            <div class="card-title">Payment Metadata</div>
            <div class="info-row">
              <span class="info-label">Payment Date:</span>
              <span class="info-val" style="font-size: 9px;">${paymentDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Method:</span>
              <span class="info-val" style="text-transform: uppercase;">${transaction.method.replace('_', ' ')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Reference No:</span>
              <span class="info-val">${transaction.reference}</span>
            </div>
          </div>
        </div>

        <div class="amount-section">
          <div class="amount-label">Verified Payment Amount</div>
          <div class="amount-value">SLE ${Number(transaction.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
        </div>

        <div class="footer-layout">
          <div>
            <div class="security-badge">
              <div style="font-size: 7px; font-weight: bold; text-transform: uppercase; color: #555; margin-bottom: 2px;">Receipt Security Code</div>
              <div class="security-code">${uniqueSecCode}</div>
            </div>
            <div style="font-size: 8px; color: #64748b; margin-top: 6px; font-weight: 500;">
              * This is an officially verified electronic payment receipt.
            </div>
          </div>
          <div>
            <div class="sig-block">
              Authorized Finance Department
            </div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

