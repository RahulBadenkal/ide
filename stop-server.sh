#!/bin/bash
set -e


# Check if a port is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <port>"
  exit 1
fi

PORT=$1

# Find the process using the port
PID=$(lsof -t -i :"$PORT")

# Check if a process was found
if [ -z "$PID" ]; then
  echo "No process is running on port $PORT"
else
  echo "Killing process $PID on port $PORT"
  kill -9 "$PID"
  echo "Process $PID has been killed"
fi
