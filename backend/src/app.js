import express from 'express';
import healthRouter from './routes/health.js';
import roomsRouter from './routes/rooms.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(express.json());
app.use(healthRouter);
app.use(roomsRouter);
app.use(errorHandler);
