import 'dotenv/config';
import { app } from './app.js';
import db from './db/index.js';
import { scheduleRetentionJob } from './cron/retention.js';

// Keep a reference to the db so it stays open while the server is running.
// eslint-disable-next-line no-unused-vars
const _db = db;

scheduleRetentionJob(db);

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
