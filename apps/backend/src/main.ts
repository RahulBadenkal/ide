import express from 'express';
import expressWs from 'express-ws';


// Import routes
import {router as workspaceRouter} from "@/views/workspace/routes"
import { errorToHttpErrorPayload } from "@ide/ts-utils/src/lib/http";
import { PUBLIC_DIR_PATH } from './constants';

// Create Express application
const app = express();
const { app: wsApp } = expressWs(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(PUBLIC_DIR_PATH));

// Register routes
app.use('/api/workspace', workspaceRouter);

// WebSocket route


// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const payload = errorToHttpErrorPayload(error)
  return res.status(payload.status).jsonp(payload)
});

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});