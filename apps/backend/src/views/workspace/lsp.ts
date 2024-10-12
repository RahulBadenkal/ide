import { spawn } from 'child_process';

// Path to your TypeScript Language Server binary
const tsServerPath = '/home/rahul/Desktop/Personal Projects/ide/node_modules/.bin/typescript-language-server';

// Spawn the TypeScript Language Server process with '--stdio'
const tsServer = spawn(tsServerPath, ['--stdio']);

// Function to send messages to the Language Server
const sendMessage = (message: object) => {
  const jsonMessage = JSON.stringify(message);
  const contentLength = Buffer.byteLength(jsonMessage, 'utf8');
  const header = `Content-Length: ${contentLength}\r\n\r\n`;
  tsServer.stdin.write(header + jsonMessage);
};

// Listen for messages from the Language Server
tsServer.stdout.on('data', (data) => {
  console.log('Received message:', data.toString());
});

// Basic Initialize message according to the LSP specification
const initializeMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    processId: process.pid,
    rootUri: null,
    capabilities: {}
  }
};

// Send the initialize message
sendMessage(initializeMessage);

// Handle errors from the server
tsServer.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});

// Handle the server closing
tsServer.on('close', (code) => {
  console.log(`Language server exited with code ${code}`);
});