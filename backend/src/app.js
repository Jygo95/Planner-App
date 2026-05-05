import express from 'express';
import healthRouter from './routes/health.js';
import roomsRouter from './routes/rooms.js';
import bookingsRouter from './routes/bookings.js';
import chatRouter from './routes/chat.js';
import { errorHandler } from './middleware/errorHandler.js';
import { dbBusyHandler } from './middleware/reliability.js';

export const app = express();

app.use(express.json());
app.use(healthRouter);
app.use(roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/chat', chatRouter);
app.use(dbBusyHandler);
app.use(errorHandler);
