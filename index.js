import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logInfo } from './logger.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  logInfo(`Server listening on port ${port}`);
});

export default app;
