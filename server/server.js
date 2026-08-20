const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { getDb, persist } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ---------- Helpers ----------

function normalize(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value.toISOString().split('T')[0];
  const str = String(value).trim();
  if (!str) return null;
  // Try Excel serial number
  if (/^\d+(\.\d+)?$/.test(str)) {
    const d = xlsx.SSF.parse_date_code(parseFloat(str));
    if (d) {
      const fixed = new Date(Date.UTC(d.y, d.m - 1, d.d));
      return fixed.toISOString().split('T')[0];
    }
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

function parseNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function parseIntValue(value) {
  const n = parseNumber(value);
  return n === null ? null : Math.round(n);
}

function weekKey(isoDate) {
  return isoDate; // Week commencing is already a single date
}

function getPriorWeek(isoDate, advisor, db) {
  const advisorRecords = db.quality
    .filter(q => normalize(q.advisor) === normalize(advisor))
    .filter(q => q.weekCommencing < isoDate)
    .sort((a, b) => (a.weekCommencing > b.weekCommencing ? -1 : 1));
  return advisorRecords[0] || null;
}

function getAdvisorQualityForWeek(advisor, isoDate, db) {
  return db.quality.find(q => normalize(q.advisor) === normalize(advisor) && q.weekCommencing === isoDate) || null;
}

function findSheet(workbook, possibleNames) {
  const names = workbook.SheetNames.map(n => n.toLowerCase().trim());
  for (const candidate of possibleNames) {
    const idx = names.indexOf(candidate.toLowerCase().trim());
    if (idx >= 0) return workbook.Sheets[workbook.SheetNames[idx]];
  }
  // If only one sheet, use it
  if (workbook.SheetNames.length === 1) {
    return workbook.Sheets[workbook.SheetNames[0]];
  }
  return null;
}

function sheetToRows(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows || rows.length === 0) return [];
  return rows.map(row => {
    const normalized = {};
    for (const key of Object.keys(row)) {
      normalized[normalize(key)] = row[key];
    }
    return { raw: row, norm: normalized };
  });
}

function columnAliases(row, aliases) {
  for (const alias of aliases) {
    if (alias in row) return row[alias];
  }
  return undefined;
}

function validateRequired(row, required) {
  for (const { key, aliases, label } of required) {
    const val = aliases ? columnAliases(row, aliases) : row[key.toLowerCase()];
    if (val === undefined || val === '' || val === null) {
      return `Missing required column/field: ${label}`;
    }
  }
  return null;
}

function activeAdvisors(db, filters = {}) {
  const people = db.people;
  const activeSet = new Set();
  for (const e of db.efficiency) {
    if ((e.eph !== null && e.eph !== undefined && e.eph !== '') || (e.sph !== null && e.sph !== undefined && e.sph !== '')) {
      if (filters.dateFrom && e.date < filters.dateFrom) continue;
      if (filters.dateTo && e.date > filters.dateTo) continue;
      activeSet.add(normalize(e.advisor));
    }
  }
  let result = people.filter(p => activeSet.has(normalize(p.advisor)));
  if (filters.teamLeader) result = result.filter(p => normalize(p.teamLeader) === normalize(filters.teamLeader));
  if (filters.advisor) result = result.filter(p => normalize(p.advisor) === normalize(filters.advisor));
  return result;
}

function filterEfficiency(db, filters = {}) {
  return db.efficiency.filter(e => {
    if (filters.dateFrom && e.date < filters.dateFrom) return false;
    if (filters.dateTo && e.date > filters.dateTo) return false;
    if (filters.teamLeader && normalize(e.teamLeader) !== normalize(filters.teamLeader)) return false;
    if (filters.advisor && normalize(e.advisor) !== normalize(filters.advisor)) return false;
    return true;
  });
}

function filterQuality(db, filters = {}) {
  return db.quality.filter(q => {
    if (filters.teamLeader && normalize(q.teamLeader) !== normalize(filters.teamLeader)) return false;
    if (filters.advisor && normalize(q.advisor) !== normalize(filters.advisor)) return false;
    if (filters.weekCommencing && q.weekCommencing !== filters.weekCommencing) return false;
    return true;
  });
}

function avg(arr, key) {
  const values = arr.map(x => x[key]).filter(v => v !== null && v !== undefined && !isNaN(v));
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function safeNumber(n) {
  return n === null || n === undefined || isNaN(n) ? null : n;
}

function isPip(advisor, db) {
  return db.pips.some(p => normalize(p.advisor) === normalize(advisor));
}

// ---------- Import Routes ----------

function registerImport(type, possibleSheetNames, requiredColumns, processor) {
  app.post(`/api/import/${type}`, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const workbook = xlsx.readFile(req.file.path, { cellDates: true, dateNF: 'yyyy-mm-dd' });
      const sheet = findSheet(workbook, possibleSheetNames);
      if (!sheet) {
        return res.status(400).json({ error: `Could not find expected sheet. Looked for: ${possibleSheetNames.join(', ')}` });
      }
      const rows = sheetToRows(sheet);
      const result = processor(rows, req.file.originalname);
      persist();
      getDb().imports.unshift({
        id: Date.now().toString(),
        type,
        filename: req.file.originalname,
        timestamp: new Date().toISOString(),
        summary: result
      });
      persist();
      res.json(result);
    } catch (err) {
      console.error('Import error:', err);
      res.status(500).json({ error: err.message || 'Import failed' });
    }
  });
}

registerImport('people', ['people'], [
  { key: 'advisor', label: 'Advisor' },
  { key: 'team leader', label: 'Team Leader' }
], (rows, filename) => {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    if (!advisorVal || !teamLeaderVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Advisor or Team Leader`);
      continue;
    }
    const existingIdx = db.people.findIndex(p => normalize(p.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.people[existingIdx].id : `${Date.now()}-${processed}`,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal).trim(),
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.people[existingIdx];
      if (normalize(existing.teamLeader) === normalize(record.teamLeader)) {
        unchanged++;
      } else {
        updated++;
      }
      db.people[existingIdx] = record;
    } else {
      added++;
      db.people.push(record);
    }
  }
  return {
    success: true,
    message: 'People import complete',
    recordsFound: processed,
    added,
    updated,
    unchanged,
    rejected,
    errors: errors.slice(0, 10)
  };
});

registerImport('efficiency', ['efficiency', 'sph_eph', 'spheph'], [
  { key: 'date', label: 'Date' },
  { key: 'advisor', label: 'Advisor' },
  { key: 'team leader', label: 'Team Leader' }
], (rows, filename) => {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const dateVal = parseDate(norm['date']);
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    const ephVal = parseNumber(norm['eph']);
    const sphVal = parseNumber(norm['sph']);
    if (!dateVal || !advisorVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Date or Advisor`);
      continue;
    }
    if ((ephVal === null || ephVal === undefined) && (sphVal === null || sphVal === undefined)) {
      rejected++;
      errors.push(`Row ${processed}: missing EPH and SPH`);
      continue;
    }
    const existingIdx = db.efficiency.findIndex(e => e.date === dateVal && normalize(e.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.efficiency[existingIdx].id : `${Date.now()}-${processed}`,
      date: dateVal,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal || '').trim(),
      eph: ephVal,
      sph: sphVal,
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.efficiency[existingIdx];
      if (existing.eph === record.eph && existing.sph === record.sph && normalize(existing.teamLeader) === normalize(record.teamLeader)) {
        unchanged++;
      } else {
        updated++;
        db.efficiency[existingIdx] = record;
      }
    } else {
      added++;
      db.efficiency.push(record);
    }
  }
  return {
    success: true,
    message: 'Efficiency import complete',
    recordsFound: processed,
    added,
    updated,
    unchanged,
    rejected,
    errors: errors.slice(0, 10)
  };
});

registerImport('quality', ['quality'], [
  { key: 'week', aliases: ['week', 'week commencing', 'week start', 'weekstart'], label: 'Week Commencing' },
  { key: 'advisor', label: 'Advisor' },
  { key: 'team leader', label: 'Team Leader' },
  { key: 'true score', label: 'True Score' },
  { key: 'potential score', label: 'Potential Score' }
], (rows, filename) => {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const weekVal = parseDate(columnAliases(norm, ['week', 'week commencing', 'week start', 'weekstart']));
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    const trueScoreVal = parseIntValue(norm['true score']);
    const potentialScoreVal = parseIntValue(norm['potential score']);
    if (!weekVal || !advisorVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Week or Advisor`);
      continue;
    }
    if (trueScoreVal === null || potentialScoreVal === null) {
      rejected++;
      errors.push(`Row ${processed}: missing True Score or Potential Score`);
      continue;
    }
    if (trueScoreVal < 0 || trueScoreVal > 100 || potentialScoreVal < 0 || potentialScoreVal > 100) {
      rejected++;
      errors.push(`Row ${processed}: invalid Quality scores (must be 0-100)`);
      continue;
    }
    const existingIdx = db.quality.findIndex(q => q.weekCommencing === weekVal && normalize(q.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.quality[existingIdx].id : `${Date.now()}-${processed}`,
      weekCommencing: weekVal,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal || '').trim(),
      trueScore: trueScoreVal,
      potentialScore: potentialScoreVal,
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.quality[existingIdx];
      if (existing.trueScore === record.trueScore && existing.potentialScore === record.potentialScore && normalize(existing.teamLeader) === normalize(record.teamLeader)) {
        unchanged++;
      } else {
        updated++;
        db.quality[existingIdx] = record;
      }
    } else {
      added++;
      db.quality.push(record);
    }
  }
  return {
    success: true,
    message: 'Quality import complete',
    recordsFound: processed,
    added,
    updated,
    unchanged,
    rejected,
    errors: errors.slice(0, 10)
  };
});

registerImport('pip', ['pip', 'pips'], [
  { key: 'advisor', label: 'Advisor' },
  { key: 'team leader', label: 'Team Leader' },
  { key: 'date added', label: 'Date Added' },
  { key: 'reason for pip', label: 'Reason for PIP' },
  { key: 'pip weeks', label: 'PIP Weeks' }
], (rows, filename) => {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    const dateAddedVal = parseDate(norm['date added']);
    const reasonVal = norm['reason for pip'];
    const weeksVal = parseIntValue(norm['pip weeks']);
    if (!advisorVal || !reasonVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Advisor or Reason for PIP`);
      continue;
    }
    const existingIdx = db.pips.findIndex(p => normalize(p.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.pips[existingIdx].id : `${Date.now()}-${processed}`,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal || '').trim(),
      dateAdded: dateAddedVal,
      reason: String(reasonVal).trim(),
      pipWeeks: weeksVal,
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.pips[existingIdx];
      if (existing.reason === record.reason && existing.pipWeeks === record.pipWeeks && existing.dateAdded === record.dateAdded) {
        unchanged++;
      } else {
        updated++;
        db.pips[existingIdx] = record;
      }
    } else {
      added++;
      db.pips.push(record);
    }
  }
  return {
    success: true,
    message: 'PIP import complete',
    recordsFound: processed,
    added,
    updated,
    unchanged,
    rejected,
    errors: errors.slice(0, 10)
  };
});

function processPeopleRows(rows) {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    if (!advisorVal || !teamLeaderVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Advisor or Team Leader`);
      continue;
    }
    const existingIdx = db.people.findIndex(p => normalize(p.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.people[existingIdx].id : `${Date.now()}-${processed}`,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal).trim(),
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.people[existingIdx];
      if (normalize(existing.teamLeader) === normalize(record.teamLeader)) {
        unchanged++;
      } else {
        updated++;
        db.people[existingIdx] = record;
      }
    } else {
      added++;
      db.people.push(record);
    }
  }
  return { success: true, message: 'People import complete', recordsFound: processed, added, updated, unchanged, rejected, errors: errors.slice(0, 10) };
}

function processEfficiencyRows(rows) {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const dateVal = parseDate(norm['date']);
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    const ephVal = parseNumber(norm['eph']);
    const sphVal = parseNumber(norm['sph']);
    if (!dateVal || !advisorVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Date or Advisor`);
      continue;
    }
    if ((ephVal === null || ephVal === undefined) && (sphVal === null || sphVal === undefined)) {
      rejected++;
      errors.push(`Row ${processed}: missing EPH and SPH`);
      continue;
    }
    const existingIdx = db.efficiency.findIndex(e => e.date === dateVal && normalize(e.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.efficiency[existingIdx].id : `${Date.now()}-${processed}`,
      date: dateVal,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal || '').trim(),
      eph: ephVal,
      sph: sphVal,
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.efficiency[existingIdx];
      if (existing.eph === record.eph && existing.sph === record.sph && normalize(existing.teamLeader) === normalize(record.teamLeader)) {
        unchanged++;
      } else {
        updated++;
        db.efficiency[existingIdx] = record;
      }
    } else {
      added++;
      db.efficiency.push(record);
    }
  }
  return { success: true, message: 'Efficiency import complete', recordsFound: processed, added, updated, unchanged, rejected, errors: errors.slice(0, 10) };
}

function processQualityRows(rows) {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const weekVal = parseDate(columnAliases(norm, ['week', 'week commencing', 'week start', 'weekstart']));
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    const trueScoreVal = parseIntValue(norm['true score']);
    const potentialScoreVal = parseIntValue(norm['potential score']);
    if (!weekVal || !advisorVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Week or Advisor`);
      continue;
    }
    if (trueScoreVal === null || potentialScoreVal === null) {
      rejected++;
      errors.push(`Row ${processed}: missing True Score or Potential Score`);
      continue;
    }
    if (trueScoreVal < 0 || trueScoreVal > 100 || potentialScoreVal < 0 || potentialScoreVal > 100) {
      rejected++;
      errors.push(`Row ${processed}: invalid Quality scores (must be 0-100)`);
      continue;
    }
    const existingIdx = db.quality.findIndex(q => q.weekCommencing === weekVal && normalize(q.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.quality[existingIdx].id : `${Date.now()}-${processed}`,
      weekCommencing: weekVal,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal || '').trim(),
      trueScore: trueScoreVal,
      potentialScore: potentialScoreVal,
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.quality[existingIdx];
      if (existing.trueScore === record.trueScore && existing.potentialScore === record.potentialScore && normalize(existing.teamLeader) === normalize(record.teamLeader)) {
        unchanged++;
      } else {
        updated++;
        db.quality[existingIdx] = record;
      }
    } else {
      added++;
      db.quality.push(record);
    }
  }
  return { success: true, message: 'Quality import complete', recordsFound: processed, added, updated, unchanged, rejected, errors: errors.slice(0, 10) };
}

function processPipRows(rows) {
  const db = getDb();
  let processed = 0, added = 0, updated = 0, unchanged = 0, rejected = 0;
  const errors = [];
  for (const { raw, norm } of rows) {
    processed++;
    const advisorVal = norm['advisor'];
    const teamLeaderVal = norm['team leader'];
    const dateAddedVal = parseDate(norm['date added']);
    const reasonVal = norm['reason for pip'];
    const weeksVal = parseIntValue(norm['pip weeks']);
    if (!advisorVal || !reasonVal) {
      rejected++;
      errors.push(`Row ${processed}: missing Advisor or Reason for PIP`);
      continue;
    }
    const existingIdx = db.pips.findIndex(p => normalize(p.advisor) === normalize(advisorVal));
    const record = {
      id: existingIdx >= 0 ? db.pips[existingIdx].id : `${Date.now()}-${processed}`,
      advisor: String(advisorVal).trim(),
      teamLeader: String(teamLeaderVal || '').trim(),
      dateAdded: dateAddedVal,
      reason: String(reasonVal).trim(),
      pipWeeks: weeksVal,
      importedAt: new Date().toISOString()
    };
    if (existingIdx >= 0) {
      const existing = db.pips[existingIdx];
      if (existing.reason === record.reason && existing.pipWeeks === record.pipWeeks && existing.dateAdded === record.dateAdded) {
        unchanged++;
      } else {
        updated++;
        db.pips[existingIdx] = record;
      }
    } else {
      added++;
      db.pips.push(record);
    }
  }
  return { success: true, message: 'PIP import complete', recordsFound: processed, added, updated, unchanged, rejected, errors: errors.slice(0, 10) };
}

app.post('/api/import/data', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = xlsx.readFile(req.file.path, { cellDates: true, dateNF: 'yyyy-mm-dd' });
    const db = getDb();
    db.people = [];
    db.efficiency = [];
    db.quality = [];
    db.pips = [];
    const results = {};
    const plan = [
      { type: 'people', names: ['people'], processor: processPeopleRows },
      { type: 'efficiency', names: ['efficiency', 'sph_eph', 'spheph'], processor: processEfficiencyRows },
      { type: 'quality', names: ['quality'], processor: processQualityRows },
      { type: 'pip', names: ['pip', 'pips'], processor: processPipRows }
    ];
    for (const { type, names, processor } of plan) {
      const sheet = findSheet(workbook, names);
      if (sheet) {
        const rows = sheetToRows(sheet);
        results[type] = processor(rows, req.file.originalname);
      } else {
        results[type] = { success: false, message: `Sheet not found for ${type}`, recordsFound: 0, added: 0, updated: 0, unchanged: 0, rejected: 0 };
      }
    }
    persist();
    const summary = { success: true, message: 'Data import complete', results };
    getDb().imports.unshift({
      id: Date.now().toString(),
      type: 'data',
      filename: req.file.originalname,
      timestamp: new Date().toISOString(),
      summary
    });
    persist();
    res.json(summary);
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message || 'Import failed' });
  }
});

app.post('/api/refresh/:type', (req, res) => {
  const { type } = req.params;
  const db = getDb();
  if (!['people', 'efficiency', 'quality', 'pip'].includes(type)) {
    return res.status(400).json({ error: 'Invalid refresh type' });
  }
  // Refresh is a no-op for JSON DB; views are computed on demand
  res.json({ success: true, message: `${type} refreshed` });
});

app.get('/api/sync', (req, res) => {
  const db = getDb();
  const teamLeaders = [...new Set(db.people.map(p => p.teamLeader).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const advisors = [...new Set(db.people.map(p => p.advisor).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  res.json({
    success: true,
    people: db.people.length,
    teamLeaders,
    advisors,
    advisorsCount: advisors.length,
    quality: db.quality.length,
    efficiency: db.efficiency.length,
    pips: db.pips.length
  });
});

app.get('/api/imports', (req, res) => {
  res.json(getDb().imports.slice(0, 50));
});

// ---------- Filter Options ----------

app.get('/api/filters/options', (req, res) => {
  const db = getDb();
  const teamLeaders = [...new Set(db.people.map(p => p.teamLeader).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const advisors = [...new Set(db.people.map(p => p.advisor).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const weeks = [...new Set(db.quality.map(q => q.weekCommencing).filter(Boolean))].sort();
  res.json({ teamLeaders, advisors, weeks });
});

// ---------- Dashboard ----------

app.get('/api/dashboard', (req, res) => {
  const db = getDb();
  const filters = {
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    teamLeader: req.query.teamLeader,
    advisor: req.query.advisor
  };

  const active = activeAdvisors(db, filters);
  const efficiency = filterEfficiency(db, filters);
  const quality = filterQuality(db, filters);

  // Date range filters do not apply to Quality on dashboard? Apply dateFrom/dateTo via week commencing
  const qualityInDateRange = quality.filter(q => {
    if (filters.dateFrom && q.weekCommencing < filters.dateFrom) return false;
    if (filters.dateTo && q.weekCommencing > filters.dateTo) return false;
    return true;
  });

  // EPH/SPH trend
  const trendMap = new Map();
  for (const e of efficiency) {
    if (!trendMap.has(e.date)) trendMap.set(e.date, { date: e.date, eph: [], sph: [] });
    if (e.eph !== null) trendMap.get(e.date).eph.push(e.eph);
    if (e.sph !== null) trendMap.get(e.date).sph.push(e.sph);
  }
  const ephSphTrend = [...trendMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, vals]) => ({
    date,
    eph: vals.eph.length ? vals.eph.reduce((x, y) => x + y, 0) / vals.eph.length : null,
    sph: vals.sph.length ? vals.sph.reduce((x, y) => x + y, 0) / vals.sph.length : null
  }));

  // Quality trend weekly
  const qualityTrendMap = new Map();
  for (const q of qualityInDateRange) {
    if (!qualityTrendMap.has(q.weekCommencing)) qualityTrendMap.set(q.weekCommencing, { week: q.weekCommencing, trueScore: [], potentialScore: [] });
    qualityTrendMap.get(q.weekCommencing).trueScore.push(q.trueScore);
    qualityTrendMap.get(q.weekCommencing).potentialScore.push(q.potentialScore);
  }
  const qualityTrend = [...qualityTrendMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, vals]) => ({
    week,
    trueScore: vals.trueScore.length ? vals.trueScore.reduce((x, y) => x + y, 0) / vals.trueScore.length : 0,
    potentialScore: vals.potentialScore.length ? vals.potentialScore.reduce((x, y) => x + y, 0) / vals.potentialScore.length : 0
  }));

  // Score distribution
  const scoreDistribution = { '0-59': 0, '60-69': 0, '70-79': 0, '80-89': 0, '90-100': 0 };
  const scoreCount = qualityInDateRange.length || 1;
  for (const q of qualityInDateRange) {
    const s = q.trueScore;
    if (s < 60) scoreDistribution['0-59']++;
    else if (s < 70) scoreDistribution['60-69']++;
    else if (s < 80) scoreDistribution['70-79']++;
    else if (s < 90) scoreDistribution['80-89']++;
    else scoreDistribution['90-100']++;
  }
  const scoreDistributionPct = Object.fromEntries(Object.entries(scoreDistribution).map(([k, v]) => [k, Math.round((v / scoreCount) * 100)]));

  // PIP distribution
  const activeCount = active.length || 1;
  const pipCount = active.filter(a => isPip(a.advisor, db)).length;
  const pipDistribution = { pip: pipCount, noPip: active.length - pipCount };

  // Top 10 by True Score (most recent week for each advisor)
  const latestQualityByAdvisor = new Map();
  const allQuality = qualityInDateRange.length ? qualityInDateRange : db.quality;
  for (const q of allQuality) {
    const key = normalize(q.advisor);
    const existing = latestQualityByAdvisor.get(key);
    if (!existing || q.weekCommencing > existing.weekCommencing) latestQualityByAdvisor.set(key, q);
  }
  const topPeople = [...latestQualityByAdvisor.values()]
    .sort((a, b) => b.trueScore - a.trueScore)
    .slice(0, 10)
    .map((q, i) => {
      const person = db.people.find(p => normalize(p.advisor) === normalize(q.advisor));
      const eff = efficiency.filter(e => normalize(e.advisor) === normalize(q.advisor));
      return {
        rank: i + 1,
        advisor: q.advisor,
        teamLeader: q.teamLeader || (person ? person.teamLeader : ''),
        eph: avg(eff, 'eph') || null,
        sph: avg(eff, 'sph') || null,
        trueScore: q.trueScore,
        potentialScore: q.potentialScore,
        pipStatus: isPip(q.advisor, db) ? 'PIP' : 'No PIP'
      };
    });

  // Recent quality
  const recentQuality = [...db.quality]
    .sort((a, b) => b.weekCommencing.localeCompare(a.weekCommencing) || b.importedAt.localeCompare(a.importedAt))
    .slice(0, 10)
    .map(q => ({
      weekCommencing: q.weekCommencing,
      advisor: q.advisor,
      teamLeader: q.teamLeader,
      trueScore: q.trueScore,
      potentialScore: q.potentialScore
    }));

  res.json({
    kpis: {
      totalAdvisors: active.length,
      avgEph: avg(efficiency, 'eph'),
      avgSph: avg(efficiency, 'sph'),
      totalQuality: qualityInDateRange.length,
      avgTrueScore: avg(qualityInDateRange, 'trueScore'),
      avgPotentialScore: avg(qualityInDateRange, 'potentialScore')
    },
    ephSphTrend,
    qualityTrend,
    scoreDistribution: scoreDistributionPct,
    pipDistribution,
    topPeople,
    recentQuality
  });
});

// ---------- People ----------

app.get('/api/people/advisors', (req, res) => {
  const db = getDb();
  const result = db.people.map(p => {
    const e = db.efficiency.filter(x => normalize(x.advisor) === normalize(p.advisor));
    const latest = db.quality
      .filter(q => normalize(q.advisor) === normalize(p.advisor))
      .sort((a, b) => b.weekCommencing.localeCompare(a.weekCommencing))[0];
    const prior = latest ? getPriorWeek(latest.weekCommencing, latest.advisor, db) : null;
    return {
      advisor: p.advisor,
      teamLeader: p.teamLeader,
      eph: avg(e, 'eph') || null,
      sph: avg(e, 'sph') || null,
      currentWeekTrueScore: latest ? latest.trueScore : null,
      currentWeekPotentialScore: latest ? latest.potentialScore : null,
      priorWeekTrueScore: prior ? prior.trueScore : null,
      priorWeekPotentialScore: prior ? prior.potentialScore : null,
      trueScoreVariance: latest && prior ? latest.trueScore - prior.trueScore : null,
      potentialScoreVariance: latest && prior ? latest.potentialScore - prior.potentialScore : null,
      pipStatus: isPip(p.advisor, db) ? 'PIP' : 'No PIP'
    };
  });
  res.json(result);
});

app.get('/api/people/team-leaders', (req, res) => {
  const db = getDb();
  const leaders = [...new Set(db.people.map(p => p.teamLeader).filter(Boolean))];
  const result = leaders.map(tl => {
    const advisors = db.people.filter(p => normalize(p.teamLeader) === normalize(tl)).map(p => p.advisor);
    const e = db.efficiency.filter(x => advisors.some(a => normalize(a) === normalize(x.advisor)));
    const q = db.quality.filter(x => advisors.some(a => normalize(a) === normalize(x.advisor)));
    const latestWeek = [...new Set(q.map(x => x.weekCommencing))].sort().pop();
    const priorWeek = [...new Set(q.map(x => x.weekCommencing))].sort().slice(-2)[0];
    const current = q.filter(x => x.weekCommencing === latestWeek);
    const prior = q.filter(x => x.weekCommencing === priorWeek && latestWeek !== priorWeek);
    return {
      teamLeader: tl,
      avgQualityCurrentWeek: avg(current, 'trueScore'),
      avgQualityPriorWeek: avg(prior, 'trueScore'),
      qualityVariance: (avg(current, 'trueScore') || 0) - (avg(prior, 'trueScore') || 0),
      avgEph: avg(e, 'eph'),
      avgSph: avg(e, 'sph')
    };
  });
  res.json(result);
});

// ---------- PIPs ----------

app.get('/api/pips', (req, res) => {
  const db = getDb();
  const search = normalize(req.query.search || '');
  let result = db.pips.map(p => ({
    advisor: p.advisor,
    teamLeader: p.teamLeader,
    dateAdded: p.dateAdded,
    reason: p.reason,
    pipWeeks: p.pipWeeks
  }));
  if (search) {
    result = result.filter(p => normalize(p.advisor).includes(search) || normalize(p.teamLeader).includes(search) || normalize(p.reason).includes(search));
  }
  res.json(result);
});

// ---------- Quality ----------

app.get('/api/quality', (req, res) => {
  const db = getDb();
  const filters = {
    teamLeader: req.query.teamLeader,
    weekCommencing: req.query.weekCommencing,
    advisor: req.query.advisor
  };
  let result = filterQuality(db, filters);
  // Compute prior week and variance
  result = result.map(q => {
    const prior = getPriorWeek(q.weekCommencing, q.advisor, db);
    return {
      teamLeader: q.teamLeader,
      advisor: q.advisor,
      weekCommencing: q.weekCommencing,
      trueScore: q.trueScore,
      potentialScore: q.potentialScore,
      lastWeekTrueScore: prior ? prior.trueScore : null,
      lastWeekPotentialScore: prior ? prior.potentialScore : null,
      trueScoreVariance: prior ? q.trueScore - prior.trueScore : null,
      potentialScoreVariance: prior ? q.potentialScore - prior.potentialScore : null
    };
  });
  result.sort((a, b) => b.weekCommencing.localeCompare(a.weekCommencing) || a.advisor.localeCompare(b.advisor));
  res.json(result);
});

app.get('/api/quality/trend', (req, res) => {
  const db = getDb();
  const teamLeader = req.query.teamLeader;
  let records = db.quality;
  if (teamLeader && teamLeader !== 'All Team Leaders') {
    records = records.filter(q => normalize(q.teamLeader) === normalize(teamLeader));
  }
  const map = new Map();
  for (const q of records) {
    if (!map.has(q.weekCommencing)) map.set(q.weekCommencing, { week: q.weekCommencing, trueScore: [], potentialScore: [] });
    map.get(q.weekCommencing).trueScore.push(q.trueScore);
    map.get(q.weekCommencing).potentialScore.push(q.potentialScore);
  }
  const trend = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, vals]) => ({
    week,
    trueScore: vals.trueScore.reduce((x, y) => x + y, 0) / vals.trueScore.length,
    potentialScore: vals.potentialScore.reduce((x, y) => x + y, 0) / vals.potentialScore.length
  }));
  res.json(trend);
});

app.get('/api/quality/weeks', (req, res) => {
  const db = getDb();
  const weeks = [...new Set(db.quality.map(q => q.weekCommencing).filter(Boolean))].sort();
  res.json(weeks);
});

// ---------- Leaderboard ----------

function computeLeaderboard(db, requestedWeek) {
  const allWeeks = [...new Set(db.quality.map(q => q.weekCommencing))].sort();
  const week = requestedWeek || allWeeks.pop();
  if (!week) return { week: null, bestEph: [], bestSph: [], highestQuality: [] };

  const qualityWeek = db.quality.filter(q => q.weekCommencing === week);
  const efficiencyWeek = db.efficiency.filter(e => e.date >= week && e.date < addDays(week, 7));

  const advisorQuality = new Map();
  for (const q of qualityWeek) advisorQuality.set(normalize(q.advisor), q);

  const advisorEff = new Map();
  for (const e of efficiencyWeek) {
    const key = normalize(e.advisor);
    if (!advisorEff.has(key)) advisorEff.set(key, []);
    advisorEff.get(key).push(e);
  }

  const bestEph = [];
  const bestSph = [];
  for (const [key, records] of advisorEff.entries()) {
    const q = advisorQuality.get(key);
    if (!q || q.trueScore <= 60) continue;
    const avgEph = avg(records, 'eph');
    const avgSph = avg(records, 'sph');
    const adv = records[0].advisor;
    const tl = records[0].teamLeader;
    if (avgEph > 0) bestEph.push({ advisor: adv, teamLeader: tl, eph: avgEph, quality: q.trueScore });
    if (avgSph > 0) bestSph.push({ advisor: adv, teamLeader: tl, sph: avgSph, quality: q.trueScore });
  }

  const highestQuality = qualityWeek
    .filter(q => q.trueScore > 0)
    .map(q => ({ advisor: q.advisor, teamLeader: q.teamLeader, trueScore: q.trueScore }))
    .sort((a, b) => b.trueScore - a.trueScore)
    .slice(0, 10);

  return {
    week,
    bestEph: bestEph.sort((a, b) => b.eph - a.eph).slice(0, 10).map((x, i) => ({ rank: i + 1, ...x })),
    bestSph: bestSph.sort((a, b) => b.sph - a.sph).slice(0, 10).map((x, i) => ({ rank: i + 1, ...x })),
    highestQuality: highestQuality.map((x, i) => ({ rank: i + 1, ...x }))
  };
}

function addDays(iso, n) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

app.get('/api/leaderboard', (req, res) => {
  res.json(computeLeaderboard(getDb(), req.query.week));
});

// ---------- Export ----------

app.get('/api/export/:type', async (req, res) => {
  const db = getDb();
  const { type } = req.params;
  let data = [];
  let columns = [];

  if (type === 'people') {
    data = db.people.filter(p => {
      if (req.query.teamLeader && normalize(p.teamLeader) !== normalize(req.query.teamLeader)) return false;
      if (req.query.advisor && normalize(p.advisor) !== normalize(req.query.advisor)) return false;
      return true;
    }).map(p => ({ Advisor: p.advisor, 'Team Leader': p.teamLeader }));
    columns = ['Advisor', 'Team Leader'];
  } else if (type === 'efficiency') {
    data = filterEfficiency(db, {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      teamLeader: req.query.teamLeader,
      advisor: req.query.advisor
    }).map(e => ({ Date: e.date, Advisor: e.advisor, 'Team Leader': e.teamLeader, EPH: e.eph, SPH: e.sph }));
    columns = ['Date', 'Advisor', 'Team Leader', 'EPH', 'SPH'];
  } else if (type === 'quality') {
    data = filterQuality(db, {
      teamLeader: req.query.teamLeader,
      advisor: req.query.advisor,
      weekCommencing: req.query.weekCommencing
    }).map(q => ({ 'Week Commencing': q.weekCommencing, Advisor: q.advisor, 'Team Leader': q.teamLeader, 'True Score': q.trueScore, 'Potential Score': q.potentialScore }));
    columns = ['Week Commencing', 'Advisor', 'Team Leader', 'True Score', 'Potential Score'];
  } else if (type === 'pips') {
    data = db.pips.filter(p => {
      if (req.query.teamLeader && normalize(p.teamLeader) !== normalize(req.query.teamLeader)) return false;
      if (req.query.advisor && normalize(p.advisor) !== normalize(req.query.advisor)) return false;
      return true;
    }).map(p => ({ Advisor: p.advisor, 'Team Leader': p.teamLeader, 'Date Added': p.dateAdded, 'Reason for PIP': p.reason, 'PIP Weeks': p.pipWeeks }));
    columns = ['Advisor', 'Team Leader', 'Date Added', 'Reason for PIP', 'PIP Weeks'];
  } else if (type === 'leaderboard') {
    const week = req.query.week || req.query.weekCommencing;
    const board = computeLeaderboard(db, week);
    data = (board.highestQuality || []).map(x => ({ Rank: x.rank, Advisor: x.advisor, 'Team Leader': x.teamLeader, 'True Score': x.trueScore }));
    columns = ['Rank', 'Advisor', 'Team Leader', 'True Score'];
  } else {
    return res.status(400).json({ error: 'Invalid export type' });
  }

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data, { header: columns });
  xlsx.utils.book_append_sheet(wb, ws, 'Export');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="excevo-${type}-export.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.get('/api/export/preview/:type', (req, res) => {
  const db = getDb();
  const { type } = req.params;
  let data = [];
  if (type === 'people') {
    data = db.people.filter(p => {
      if (req.query.teamLeader && normalize(p.teamLeader) !== normalize(req.query.teamLeader)) return false;
      if (req.query.advisor && normalize(p.advisor) !== normalize(req.query.advisor)) return false;
      return true;
    });
  } else if (type === 'efficiency') {
    data = filterEfficiency(db, { dateFrom: req.query.dateFrom, dateTo: req.query.dateTo, teamLeader: req.query.teamLeader, advisor: req.query.advisor });
  } else if (type === 'quality') {
    data = filterQuality(db, { teamLeader: req.query.teamLeader, advisor: req.query.advisor, weekCommencing: req.query.weekCommencing });
  } else if (type === 'pips') {
    data = db.pips.filter(p => {
      if (req.query.teamLeader && normalize(p.teamLeader) !== normalize(req.query.teamLeader)) return false;
      if (req.query.advisor && normalize(p.advisor) !== normalize(req.query.advisor)) return false;
      return true;
    });
  } else if (type === 'leaderboard') {
    const week = req.query.week || req.query.weekCommencing;
    const board = computeLeaderboard(db, week);
    data = board.highestQuality || [];
  }
  res.json({ count: data.length, data: data.slice(0, 50) });
});

// ---------- Static & SPA ----------

const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Excevo server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
