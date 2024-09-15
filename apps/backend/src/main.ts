import express from 'express';
import expressWs from 'express-ws';
import { DB } from "@/db/db";
import { sql } from 'slonik';

// Import routes
import workspaceRouter, {mountRouter as workspaceMountRouter} from "@/views/workspace/routes"
import { errorToHttpErrorPayload } from "@ide/ts-utils/src/lib/http";
import { PUBLIC_DIR_PATH } from './constants';
import { appUser } from './db';
import { getTableName } from "drizzle-orm";
import { httpErrorWrapper } from './helpers/helpers';

// Create Express application
const { app } = expressWs(express());

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to attach a unique request ID
app.use(httpErrorWrapper((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId || '');
  next();
}));

// Serve static files
app.use(express.static(PUBLIC_DIR_PATH));

// Register routes
workspaceMountRouter();
app.use('/api/workspace', workspaceRouter);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Uncaught error!!!")
  const payload = errorToHttpErrorPayload(error)
  console.error(payload.stackTrace || payload.message)
  return res.status(payload.status).jsonp(payload)
});


// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});