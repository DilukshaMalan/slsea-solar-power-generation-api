const fs = require('fs');
const dns = require('dns');
const path = require('path');
const { MongoClient } = require('mongodb');

process.loadEnvFile(path.join(__dirname, '..', '.env'));

// Set Google DNS servers for this script's lookups
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Insert large arrays in chunks so we don't build one giant bulk op
// for the 147,840-document generation_readings collection.
async function insertInChunks(collection, docs, chunkSize = 5000) {
  let inserted = 0;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await collection.insertMany(chunk, { ordered: false });
      inserted += chunk.length;
    }
  }
  return inserted;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Missing MONGODB_URI environment variable.');
    process.exit(1);
  }

  const seedPath = path.join(__dirname, '..', 'database', 'seed (1).json');
  const raw = fs.readFileSync(seedPath, 'utf8');
  const seedData = JSON.parse(raw);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    // Maps 1:1 to the top-level keys in seed.json
    const collections = [
      'provinces',
      'districts',
      'grid_substations',
      'solar_installations',
      'generation_readings',
      'users',
    ];

    for (const name of collections) {
      const collection = db.collection(name);
      await collection.deleteMany({});
      const docs = seedData[name] || [];

      const inserted = await insertInChunks(collection, docs, 5000);
      console.log(`Uploaded ${inserted} documents to ${name}`);
    }

    console.log('Building indexes...');

    // Hierarchy lookups (parent -> children by FK field)
    await db.collection('districts').createIndex({ province_id: 1 });
    await db.collection('grid_substations').createIndex({ district_id: 1 });
    await db.collection('solar_installations').createIndex({ substation_id: 1 });

    // Readings: this is the collection your pagination/filtering/sorting/
    // last-known-reading endpoints all hit, so it needs the most care.
    // Compound index supports: "readings for installation X, sorted by time"
    // and "most recent reading for installation X" (via sort + limit 1).
    await db.collection('generation_readings').createIndex(
      { installation_id: 1, timestamp: -1 }
    );
    // Supports time-window filtering across all installations regardless of scope
    await db.collection('generation_readings').createIndex({ timestamp: -1 });

    // Users: jurisdiction-scoped auth lookups
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ district_id: 1 });
    await db.collection('users').createIndex({ province_id: 1 });

    console.log('Indexes created.');
    console.log('MongoDB seeding completed successfully.');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});