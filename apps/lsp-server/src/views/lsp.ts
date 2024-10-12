import { spawn } from 'child_process';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

export const startProcess = () => {
  const lspProcess = spawn('/home/rahul/Desktop/Personal Projects/ide/node_modules/.bin/typescript-language-server', ['--stdio']);

  // Create message reader and writer using stdin and stdout
  const messageReader = new StreamMessageReader(lspProcess.stdout);
  const messageWriter = new StreamMessageWriter(lspProcess.stdin);
  
  return {
    process: lspProcess, reader: messageReader, writer: messageWriter
  }
}

export const stopProcess = (process) => {
  process.kill()
}

