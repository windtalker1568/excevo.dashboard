const { getDb, persist } = require('./db');

const db = getDb();

const teamLeaders = ['David Cooper', 'Sarah Miller', 'James Wilson', 'Emily Taylor'];
const advisors = [
  'John Smith', 'Alice Brown', 'Michael Green', 'Laura White', 'Robert Black',
  'Emma Clark', 'Daniel Lewis', 'Olivia Hall', 'William Young', 'Sophia King',
  'Matthew Wright', 'Isabella Scott', 'Andrew Adams', 'Mia Baker', 'Joshua Nelson',
  'Charlotte Carter', 'Ethan Mitchell', 'Amelia Perez', 'Jacob Roberts', 'Harper Turner'
];

// People
for (const [i, advisor] of advisors.entries()) {
  const teamLeader = teamLeaders[i % teamLeaders.length];
  if (!db.people.find(p => normalize(p.advisor) === normalize(advisor))) {
    db.people.push({ id: `p-${i}`, advisor, teamLeader, importedAt: new Date().toISOString() });
  }
}

function normalize(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Quality: 10 weeks
const weeks = [];
for (let w = 0; w < 10; w++) {
  const d = new Date(2026, 6, 13 + w * 7); // start 13-Jul-2026
  weeks.push(d.toISOString().split('T')[0]);
}

for (const [i, advisor] of advisors.entries()) {
  for (const [w, week] of weeks.entries()) {
    const base = 70 + (w * 2) + (i % 7);
    const trueScore = Math.min(100, Math.round(base + Math.random() * 15));
    const potentialScore = Math.min(100, Math.round(trueScore + 5 + Math.random() * 10));
    const teamLeader = teamLeaders[i % teamLeaders.length];
    const existing = db.quality.find(q => q.weekCommencing === week && normalize(q.advisor) === normalize(advisor));
    if (!existing) {
      db.quality.push({ id: `q-${i}-${w}`, weekCommencing: week, advisor, teamLeader, trueScore, potentialScore, importedAt: new Date().toISOString() });
    }
  }
}

// Efficiency: daily for each week (Mon-Fri)
for (const [i, advisor] of advisors.entries()) {
  for (const week of weeks) {
    const start = new Date(week);
    for (let d = 0; d < 5; d++) {
      const date = new Date(start);
      date.setDate(date.getDate() + d);
      const iso = date.toISOString().split('T')[0];
      const eph = (10 + Math.random() * 20).toFixed(2);
      const sph = (5 + Math.random() * 15).toFixed(2);
      const teamLeader = teamLeaders[i % teamLeaders.length];
      const existing = db.efficiency.find(e => e.date === iso && normalize(e.advisor) === normalize(advisor));
      if (!existing) {
        db.efficiency.push({ id: `e-${i}-${iso}`, date: iso, advisor, teamLeader, eph: parseFloat(eph), sph: parseFloat(sph), importedAt: new Date().toISOString() });
      }
    }
  }
}

// PIPs
const pipAdvisors = ['John Smith', 'Michael Green', 'Sophia King'];
for (const [i, advisor] of pipAdvisors.entries()) {
  const teamLeader = teamLeaders[advisors.indexOf(advisor) % teamLeaders.length];
  if (!db.pips.find(p => normalize(p.advisor) === normalize(advisor))) {
    db.pips.push({
      id: `pip-${i}`,
      advisor,
      teamLeader,
      dateAdded: '2026-08-01',
      reason: ['Performance improvement', 'Quality remediation', 'Consistency'][i],
      pipWeeks: [4, 6, 8][i],
      importedAt: new Date().toISOString()
    });
  }
}

persist();
console.log('Seeded sample data');
