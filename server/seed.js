import { seedIfEmpty, getAllLogs, getProfile } from './db.js';

console.log('[Seed] Checking database status...');
seedIfEmpty();

const profile = getProfile();
const logs = getAllLogs();
console.log(`[Seed] Current Profile: ${profile.username}, Age: ${profile.age}`);
console.log(`[Seed] Total Logs in Database: ${logs.length}`);
process.exit(0);
