// One-off script: sets real bcrypt password hashes on the 5 seeded users
// (the seed data has placeholder hash strings that aren't real bcrypt output).
//
// Usage: node scripts/hashPasswords.js
// Requires MONGODB_URI in your .env (same as the app).

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

// Plaintext passwords for testing — same convention for every user so
// they're easy to remember while testing. Change these before any
// real/public use; this is fine for coursework test data.
const USER_PASSWORDS = {
  'USR-0001': 'National@123',   // national
  'USR-0002': 'Provincial@123', // provincial
  'USR-0003': 'District@123',   // district (d1)
  'USR-0004': 'District@456',   // district (d2 — different district)
  'USR-0005': 'District@789',   // district (same as USR-0003)
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI environment variable.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = db.collection('users');

  for (const [user_id, plaintext] of Object.entries(USER_PASSWORDS)) {
    const hash = await bcrypt.hash(plaintext, 10);
    const result = await users.updateOne({ user_id }, { $set: { password_hash: hash } });
    if (result.matchedCount === 0) {
      console.warn(`No user found with user_id ${user_id} — skipped.`);
    } else {
      console.log(`Updated ${user_id} — login password: ${plaintext}`);
    }
  }

  console.log('\nDone. Use the emails from your seed data with these passwords to test /auth/login.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Failed to update password hashes:', err);
  process.exit(1);
});