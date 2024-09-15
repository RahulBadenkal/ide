import './Workspace.styles.scss'

import { createSignal } from "solid-js"
import { CodeEditor } from "../../components/CodeEditor/CodeEditor"
import { Whiteboard, WhiteboardProps } from "../../components/Whiteboard/Whiteboard"
import * as Y from 'yjs'
import { fromUint8Array as fromUint8ArrayToBase64, toUint8Array as fromBase64ToUint8Array } from 'js-base64'
import * as awarenessProtocol from 'y-protocols/awareness.js'
import * as random from 'lib0/random'
import { PISTON_SOCKET_BASE_URL, BACKEND_SOCKET_BASE_URL } from '../../app-shared/constants'
import { ApiState } from '../../shared/types'

// Define the base message interface
type BaseMessage = {
  userId: string;
}

// Define specific message types
type DocUpdateMessage = BaseMessage & {
  type: 'docUpdate';
  data: string;
}

type CodeEditorAwarenessMessage = BaseMessage & {
  type: 'codeEditorAwareness';
  data: string;
}

type WhiteboardCursorUpdateMessage = BaseMessage & {
  type: 'whiteboardCursorUpdate';
  data: any;
}


type Message = DocUpdateMessage | CodeEditorAwarenessMessage | WhiteboardCursorUpdateMessage


export const Workspace = () => {
  const userId = crypto.randomUUID().slice(0, 8)
  const ydoc = new Y.Doc()
  const yText = ydoc.getText('codeEditor')
  const yArray: WhiteboardProps["yArray"] = ydoc.getArray('whiteboard');

  (window as any).ydoc = ydoc  // For debugging

  const usercolors = [
    { color: '#30bced', light: '#30bced33' },
    { color: '#6eeb83', light: '#6eeb8333' },
    { color: '#ffbc42', light: '#ffbc4233' },
    { color: '#ecd444', light: '#ecd44433' },
    { color: '#ee6352', light: '#ee635233' },
    { color: '#9ac2c9', light: '#9ac2c933' },
    { color: '#8acb88', light: '#8acb8833' },
    { color: '#1be7ff', light: '#1be7ff33' }
  ]
  
  // select a random color for this user
  const userColor = usercolors[random.uint32() % usercolors.length]

  const codeEditorAwareness = new awarenessProtocol.Awareness(ydoc)
  codeEditorAwareness.setLocalStateField('user', {
    name: userId,
    color: userColor.color,
    colorLight: userColor.light
  })

  const [output, setOutput] = createSignal("")
  const [runtime, setRuntime] = createSignal("python___3.12.0")

  ydoc.on("update", (update, _, __, tr) => {
    if (tr.local) {
      // send to peers
      const base64Update = fromUint8ArrayToBase64(update)
      const message: DocUpdateMessage = {userId, type: 'docUpdate', data: base64Update}
     
      sendMessage(message)
    }
  })

  codeEditorAwareness.on('update', ({ added, updated, removed }: any, origin: any) => {
    if (origin !== 'local') {
      return
    }
    const changedClients = added.concat(updated).concat(removed)
    const update = awarenessProtocol.encodeAwarenessUpdate(codeEditorAwareness, changedClients)
    const message: CodeEditorAwarenessMessage = {
      type: "codeEditorAwareness",
      userId,
      data: fromUint8ArrayToBase64(update)
    }
    sendMessage(message)
  })

  const [whiteboardRemoteCursors, setWhiteboardRemoteCursors] = createSignal<{[userId: string]: any}>({})

  const whiteboardCursorUpdate = (payload) => {
    const message: any = {
      type: "whiteboardCursorUpdate",
      userId,
      data: {
        ...payload,
        username: userId,
        userState: "active",
        color: {
            background: "#ffeedd",
            stroke: "#000000",
        },
        avatarUrl: "https://gravatar.com/avatar/0e32bc1df35ba2392875b97f7d6071bf?s=400&d=robohash&r=x",
        id: userId
      }
    }
    sendMessage(message)
  }

  const socket = new WebSocket(BACKEND_SOCKET_BASE_URL);

  const sendMessage = (message: Message) => {
    if (socket && socket.readyState === socket.OPEN) {
      // console.log('send message to server', message)
      // console.log("\n")
      socket.send(JSON.stringify(message))
    }
  }

  socket.onopen = (event) => {
    console.log('Connected to WebSocket server');
  };

  socket.onmessage = (event) => {
    const message: Message = JSON.parse(event.data)
    // console.log('Message from server:', message);
    // console.log("\n")

    switch (message.type) {
      case "docUpdate": {
        const update = fromBase64ToUint8Array(message.data)
        Y.applyUpdate(ydoc, update, "peer")
        break
      }
      case "codeEditorAwareness": {
        const update = fromBase64ToUint8Array(message.data)
        awarenessProtocol.applyAwarenessUpdate(
          codeEditorAwareness,
          update,
          message.userId
        )
        break
      }
      case "whiteboardCursorUpdate": {
        setWhiteboardRemoteCursors({
          ...whiteboardRemoteCursors(),
          [message.userId]: message.data
        })
        break
      }
    }
  }
  
  socket.onclose = (event) => {
    console.log('Disconnected from WebSocket server');
  }

  socket.onerror = (event) => {
    console.error('WebSocket error:', event);
  }

  const [runStatus, setRunStatus] = createSignal<ApiState>(ApiState.NOT_LOADED)
  const [exitSignal, setExitSignal] = createSignal()
  const run = () => {
    setRunStatus(ApiState.LOADING)
    setExitSignal()
    setOutput("")
    const socket = new WebSocket(PISTON_SOCKET_BASE_URL + '/connect');
    socket.onopen = (event) => {
      socket.send(JSON.stringify({
        "type": 'init',
        "language": langauge,
        "version": version,
        "files": [
            {
                "name": "code.py",
                "content": yText.toJSON()
            }
        ]
      }))
      console.log('Connected to piston WebSocket server');
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      switch (message.type) {
        case "runtime": {
          break 
        }
        case "stage": {
          break
        }
        case "data": {
          const data = message.data.replace(/(?:\r\n|\r|\n)/g, '<br>');
          const x = message.stream === 'stdout' ? data : `<span class='text-red-600'>${data}</span>`
          setOutput(output() + x)
          break;
        }
        case "error": {
          console.error(message.message) 
          break
        }
        case "exit": {
          setExitSignal(message.signal)
          if (exitSignal()) {
            setOutput(output() + "\n" + `<span class='text-red-600'>SIGNAL: ${message.signal}</span>`)
          }
          break;
        }
       
      }
    }
    socket.onclose = (event) => {
      if (event.code === 4999 && !exitSignal()) {
        setRunStatus(ApiState.SUCCESS)
      }
      else {
        setRunStatus(ApiState.ERROR)
      }
      console.log('Disconnected from piston WebSocket server', event);
    }
    socket.onerror = (event) => {
      console.error('piston WebSocket error:', event);
    }
    const [langauge, version] = [runtime().split('___')[0], runtime().split('___')[1]]
  }

  return (
    <>
      <div class="grid grid-cols-12 gap-16 min-h-[1000px]">
        <div class="col-span-4">
          <div class='h-[30%]'>
            <div class="flex justify-between">
              <div>
                <label for="runtime">Choose a runtime:</label>
                <select
                  name="runtime"
                  id="runtime"
                  value={runtime()}
                  onInput={(e) => setRuntime(e.target.value)}
                >
                  <option value="python___3.12.0">Python 3.12</option>
                  <option value="javascript___20.11.1">Node 20</option>
                </select>
              </div>
              <div>
                <button onClick={run} disabled={runStatus() === ApiState.LOADING}>Run</button>
              </div>
            </div>
            <CodeEditor yText={yText} awareness={codeEditorAwareness}>
            </CodeEditor>
           
          </div>
          <div class='h-[10%]'></div>
          <div class='h-[60%] flex flex-col'>
            <div>Status: {runStatus()}</div>
            <div class='grow' innerHTML={output()}>
            </div>
          </div>
         
        </div>
        <div class="col-span-8">
          <Whiteboard yArray={yArray} collaborators={whiteboardRemoteCursors()} onCursorUpdate={whiteboardCursorUpdate}></Whiteboard>
        </div>
      </div>
    </>
  )
}
