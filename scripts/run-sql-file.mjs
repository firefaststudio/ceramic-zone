import fs from 'fs';
import { Client } from 'pg';

const conn = process.env.PG_CONN;
if (!conn) {
  console.error('Please set PG_CONN env variable to the Postgres connection string');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node run-sql-file.mjs <sql-file-path>');
  process.exit(1);
}

const sql = fs.readFileSync(file, 'utf8');

(async () => {
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('Connected to Postgres, executing file:', file);
    const res = await client.query(sql);
    console.log('Execution completed.');
    // show brief result
    if (res.command) console.log('Command:', res.command);
  } catch (err) {
    console.error('Error executing SQL file:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
