const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const STATE_ROW_ID = 'primary';

function emptyDb() {
  return { people: [], efficiency: [], quality: [], pips: [], imports: [] };
}

function loadLocal() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) return emptyDb();
    return { ...emptyDb(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch (err) {
    console.error('Local DB load error:', err.message);
    return emptyDb();
  }
}

function saveLocal(state) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);
let supabase;
if (useSupabase) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

let db = useSupabase ? emptyDb() : loadLocal();
let initialized = !useSupabase;
let saveQueue = Promise.resolve();

async function ready() {
  if (initialized) return;
  const { data, error } = await supabase.from('dashboard_state').select('data').eq('id', STATE_ROW_ID).maybeSingle();
  if (error) throw new Error(`Could not load Supabase data: ${error.message}`);
  if (data && data.data) db = { ...emptyDb(), ...data.data };
  initialized = true;
}

function getDb() {
  return db;
}

function persist() {
  if (!useSupabase) {
    try { saveLocal(db); } catch (err) { console.error('Local DB save error:', err.message); }
    return Promise.resolve();
  }
  // Serialize writes so rapid imports cannot overwrite a newer in-memory state.
  saveQueue = saveQueue.then(async () => {
    const snapshot = JSON.parse(JSON.stringify(db));
    const { error } = await supabase.from('dashboard_state').upsert({
      id: STATE_ROW_ID, data: snapshot, updated_at: new Date().toISOString()
    });
    if (error) throw new Error(`Could not save Supabase data: ${error.message}`);
  });
  return saveQueue;
}

module.exports = { getDb, persist, ready };
