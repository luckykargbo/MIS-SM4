const fs = require('fs');
const content = fs.readFileSync('c:/Users/lucky/Desktop/MISu/src/app/dashboard/page.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('currentView') || line.includes('currentView ===') || line.includes('setCurrentView')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
