import { batch, createEffect, createMemo, createSignal, For, Match, onMount, Show, Switch } from "solid-js"
import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"
import { BACKEND_HTTP_BASE_URL, BACKEND_SOCKET_BASE_URL } from "@/helpers/constants";
import { useNavigate, useParams } from "@solidjs/router";
import { deepClone, formUrl, isNullOrUndefined, sleep } from "@ide/ts-utils/src/lib/utils";
import { getCookie } from "@ide/browser-utils/src/lib/utils";
import { Awareness, Collaborator, Doc, Language, Role } from "@ide/shared/src/lib/types"
import * as Y from "yjs"
import { fromBase64ToUint8Array, fromUint8ArrayToBase64 } from "@ide/shared/src/lib/helpers"
import { makeGetCall } from "@ide/ts-utils/src/lib/axios-utils"
import './Workspace.styles.scss'

// import icon
import CheckIcon from 'lucide-solid/icons/check';
import PencilOffIcon from 'lucide-solid/icons/pencil-off'
import ChevronDownIcon from 'lucide-solid/icons/chevron-down';
import Share2Icon from 'lucide-solid/icons/share-2';
import GlobeIcon from 'lucide-solid/icons/globe';
import LinkIcon from 'lucide-solid/icons/link';
import LayoutDashboardIcon from 'lucide-solid/icons/layout-dashboard';
import SettingsIcon from 'lucide-solid/icons/settings';
import CircleUserRound from 'lucide-solid/icons/circle-user-round'
import RunIcon from '@/assets/run/run.svg'
import ReRunIcon from '@/assets/rerun/rerun.svg'
import StopIcon from '@/assets/stop/stop.svg'
import PythonIcon from '@/assets/python/python.svg'
import PythonRunningIcon from '@/assets/runningPythonNotebook/runningPythonNotebook.svg'
import JsIcon from '@/assets/javaScript/javaScript.svg'
import Loader2Icon from 'lucide-solid/icons/loader-2';
import RefreshCcwIcon from 'lucide-solid/icons/refresh-ccw'
import CodeXmlIcon from 'lucide-solid/icons/code-xml';
import CirclePlayIcon from 'lucide-solid/icons/circle-play';
import ArrowUpNarrowWideIcon from 'lucide-solid/icons/arrow-up-narrow-wide'
import ArrowDownNarrowWideIcon from 'lucide-solid/icons/arrow-down-narrow-wide'
import Trash2Icon from 'lucide-solid/icons/trash-2'
import WrapText from 'lucide-solid/icons/wrap-text'

// import components
import PageLoader from "@/components/PageLoader/PageLoader";
import { Separator } from "@/components/ui/separator";
import { TextField, TextFieldLabel, TextFieldRoot } from "@/components/ui/textfield";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type {
  DropdownMenuSubTriggerProps,
} from "@kobalte/core/dropdown-menu";
import { Button } from "@/components/ui/button"
import { Switch as SwitchUI, SwitchControl, SwitchThumb, SwitchLabel } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Combobox,
  ComboboxItem,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput
} from "@/components/ui/combobox";
import { Pane, PaneProps, Tab } from "./Pane";
import { CodeEditor } from "@/components/CodeEditor/CodeEditor";
import { Whiteboard, WhiteboardProps } from "@/components/Whiteboard/Whiteboard";
import { SplitPane, SplitPaneProps } from "@/components/SplitPane/SplitPane";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { Reconnecting } from "./Reconnecting"
import { Checkbox, CheckboxControl, CheckboxLabel } from "@/components/ui/checkbox";


// types
type LanguageMetadata = { id: Language, display: string, fileName: string, icon: any, runningIcon?: any }

enum TabType {
  WHITEBOARD = "whiteboard",
  CODE_EDITOR = "code-editor",
  CONSOLE = "console",
  // DUMMY = "dummy"
}

type SplitNodeSplitter = {
  type: "splitter",
  splitterId: string;
  children: SplitNode[]
}
type SplitNodeElement = {
  type: "pane",
  paneId: string;
}
type SplitNode = SplitNodeSplitter | SplitNodeElement
type SplitterPropsMap = {
  [splitterId: string]: {
    direction: SplitPaneProps["direction"], sizes: number[], storedSizes: number[]
  }
}
type PanePropsMap = {
  [paneId: string]: {
    tabs: { id: string, type: TabType }[], activeTabId: string
  }
}

type DraggedItemPane = {
  type: "pane", paneId: string
}
type DraggedItemTab = {
  type: "tab", paneId: string, tabId: string;
}
type DraggedItem = DraggedItemPane | DraggedItemTab
type DropTarget = {
  el: { outer: { class: string; style: string }, inner: { class: string; style: string } },
  to?: {type: "1", direction: SplitPaneProps["direction"], insert: "before" | "after"} |
      {type: "2", paneId: string, index: number} |
      {type: "3", paneId: string, direction: SplitPaneProps["direction"], insert: "before" | "after"}
}

// Constants
const LANGUAGE_METADATA: Map<Language, LanguageMetadata> = new Map([
  /* @ts-ignore */
  [Language.PYTHON_3_12, { id: Language.PYTHON_3_12, display: 'Python (v3.12)', fileName: 'code.py', icon: (props) => <PythonIcon size={14} {...props} />, runningIcon: (props) => <PythonRunningIcon size={14} {...props} /> }],
  /* @ts-ignore */
  [Language.JS_NODE_20, { id: Language.JS_NODE_20, display: 'JavaScript (Node v20)', fileName: 'code.js', icon: (props) => <JsIcon size={14} {...props} /> }]
])
const LANGUAGES: LanguageMetadata[] = [
  Language.PYTHON_3_12,
  Language.JS_NODE_20
].map((x) => LANGUAGE_METADATA.get(x))
const SPLITTER_MIN_SIZE = 36
const SPLITTER_GUTTER_SIZE = 10
const COLORS = [
  'bg-cyan-400',
  'bg-rose-400',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
]
const TABS_METADATA: { [tabId in TabType]: Omit<Tab, "id" | "icon"> & { icon: any } } = {
  [TabType.WHITEBOARD]: { title: 'Whiteboard', icon: () => <CodeXmlIcon size={16} /> },
  [TabType.CODE_EDITOR]: { title: 'Code', icon: () => <CodeXmlIcon size={16} /> },
  [TabType.CONSOLE]: { title: 'Console', icon: () => <CodeXmlIcon size={16} /> },
  // [TabType.DUMMY]: { title: 'Dummy', icon: () => <CodeXmlIcon size={16} /> }
}

// Component
export const Workspace = () => {
  // helpers
  const sendMessage = (message: any) => {
    if (socket() && socket().readyState === socket().OPEN) {
      // console.log('send message to server', message)
      // console.log("\n")
      socket().send(JSON.stringify(message))
    }
  }

  const handleIncomingMessage = (message: any) => {
    const { type, data, docDelta, awarenessDelta } = message

    if (docDelta) {
      Y.applyUpdate(yDoc(), fromBase64ToUint8Array(docDelta))
    }
    if (awarenessDelta) {
      Y.applyUpdate(yAwareness(), fromBase64ToUint8Array(awarenessDelta))
    }

    switch (type) {
      case "init": {
        setUser(data.user)
        setRole(data.role)

        Y.applyUpdate(yDoc(), fromBase64ToUint8Array(data.yDoc))
        Y.applyUpdate(yAwareness(), fromBase64ToUint8Array(data.yAwareness))

        // set other ui info
        setPageUrl()
        setPageLoadApiInfo({ state: ApiState.LOADED })
        setSocketLoadInfo({ state: ApiState.LOADED })
        setSocketRetryCount(0)
        console.log(doc())
        break
      }
      case "toggleSharing": {
        setPageUrl()
        break
      }
      case "codeExecutionMessage": {
        if (consoleContainerRef() && isAtBottomOfConsole()) {
          consoleContainerRef().scrollTop = consoleContainerRef().scrollHeight
        }
        break
      }
      case "error": {
        if (pageLoadApiInfo().state !== ApiState.LOADED) {
          setPageLoadApiInfo({ state: ApiState.ERROR, error: data })
        }
        setSocketLoadInfo({ state: ApiState.ERROR, error: data })
        console.error(data)
        break
      }
    }
  }

  const onSocketOpen = (event: Event) => {
    console.log('Connected to WebSocket server', event);
  }

  const onSocketMessage = (event) => {
    const message = JSON.parse(event.data)
    handleIncomingMessage(message)
  }

  const onSocketError = (error: Event) => {
    console.error('WebSocket error', error);
  }

  const onSocketClose = async () => {
    if (pageLoadApiInfo().state === ApiState.LOADED && socketRetryCount() < 3 && !(socketLoadInfo().error?.status || 500).toString().startsWith("4")) {
      return setupSocket(true)
    }

    if (pageLoadApiInfo().state !== ApiState.LOADED) {
      setPageLoadApiInfo({
        state: ApiState.ERROR, error: {
          status: 500,
          code: "server_error",
          message: "Internal server error"
        }
      })
    }
    if (socketLoadInfo().state !== ApiState.ERROR) {
      setSocketLoadInfo({
        state: ApiState.ERROR, error: {
          status: 500,
          code: "server_error",
          message: "Internal server error"
        }
      })
    }
    // If closed by app purposefully, show a modal with error message and two options - try again, go to dashboard
    // if closed due to unknown reason
    //   - if page not loaded -> Show modal with error mesage adn two optios - try again and go to dashboard
    //   - if page loaded
    //        - show reconnecting UI and try for 3 more times
    //        - if already tried 3 times, show a modal with error message and two options - try again and go to dashboard
    console.log('Disconnected from WebSocket server', event);
  }

  const closeSocketEvents = () => {
    socket().removeEventListener("open", onSocketOpen)
    socket().removeEventListener("message", onSocketMessage)
    socket().removeEventListener("error", onSocketError)
    socket().removeEventListener("close", onSocketClose)
  }

  const setupSocket = async (retry = false) => {
    // TODO: Take care of case when error / close events for an older socket fires when new socket is created
    if (socket()) {
      if (socket().readyState === WebSocket.OPEN) {
        socket().close()
        closeSocketEvents()
      }
    }

    if (pageLoadApiInfo().state !== ApiState.LOADED) {
      setPageLoadApiInfo({ state: ApiState.LOADING })
    }

    setSocketRetryCount(socketRetryCount() + 1)
    setSocketLoadInfo({ state: ApiState.LOADING })
    if (retry) {
      await sleep(1000)
    }
    const _socket = new WebSocket(formUrl({ basePath: BACKEND_SOCKET_BASE_URL, otherPath: "api/workspace/room", params: { documentId: params.documentId, roomId: params.roomId, 'x-user-id': getCookie('x-user-id') } }))
    setSocket(_socket)

    // Add listeners
    _socket.onopen = onSocketOpen
    _socket.onmessage = onSocketMessage
    _socket.onerror = onSocketError
    _socket.onclose = onSocketClose
  }


  // yjs events
  const onYjsDocUpdate = (update, _, __, tr) => {
    // console.log('update', tr.local, tr.origin)
    const { type = null, ...data } = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}
    if (tr.local) {
      // change made by current user, send to peers
      const base64Update = fromUint8ArrayToBase64(update)
      const message = { type, data, docDelta: base64Update }
      sendMessage(message)
    }
    // update local doc
    setDoc(yDoc().getMap().toJSON() as any)
    // console.log(doc())
  }

  const onYjsAwarenessUpdate = (update, _, __, tr) => {
    const { type = null, ...data } = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}
    if (tr.local) {
      // change made by current user, send to peers
      const base64Update = fromUint8ArrayToBase64(update)
      const message = { type, data, awarenessDelta: base64Update }
      sendMessage(message)
    }
    setAwareness(yAwareness().getMap().toJSON() as any)
    console.log(awareness())
  }

  const setupYjsEvents = () => {
    yDoc().on("update", onYjsDocUpdate)
    yAwareness().on("update", onYjsAwarenessUpdate)
  }

  const closeYjsEvents = () => {
    if (yDoc()) {
      yDoc().destroy()
    }
    if (yAwareness()) {
      yAwareness().destroy()
    }
  }

  const enableFullScreen = () => {
    // Logic ->
    // Make sizes of all splitter children 0 except for the paths that have the pane which has full screen enabled, make that 100
    const paneId = paneInFullScreen()

    const _updateSizes = (node: SplitNode) => {
      if (node.type === "pane") {
        return node.paneId === paneId
      }

      for (let [index, childNode] of node.children.entries()) {
        const found = _updateSizes(childNode)
        if (found) {
          const nodeProps = splitterPropsMap()[node.splitterId]
          nodeProps.sizes = nodeProps.sizes.fill(0)
          nodeProps.sizes[index] = 100
          return true
        }
      }

      return false
    }

    _updateSizes(splitNodes())
    setSplitterPropsMap({ ...splitterPropsMap() })
    for (let splitterId of Object.keys(splitterRefs)) {
      splitterRefs[splitterId].recreate()
    }
    console.log(splitterPropsMap())
  }

  const disableFullScreen = () => {
    const _restoreSizes = (node: SplitNode) => {
      if (node.type === "pane") return

      const nodeProps = splitterPropsMap()[node.splitterId]

      nodeProps.sizes = [...nodeProps.storedSizes]  // restore sizes

      for (let childNode of node.children) {
        _restoreSizes(childNode)
      }
    }

    _restoreSizes(splitNodes())
    setSplitterPropsMap({ ...splitterPropsMap() })
    console.log(splitterPropsMap())
    for (let splitterId of Object.keys(splitterRefs)) {
      splitterRefs[splitterId].recreate()
    }
    // computeTabDirection()
  }


  const inRect = (rect: number[][], point: number[]) => {
    // Points on rect is considered to be inside rect
    // rect starts fomr top left and moves clockwise
    if (point[0] < rect[0][0] || point[0] > rect[1][0]) {
      return false
    }
    if (point[1] < rect[0][1] || point[1] > rect[2][1]) {
      return false
    }
    return true
  }

  const partInConcentricRect = (outer: number[][], inner: number[][], point: number[]): "out" | "in" | "top" | "right" | "bottom" | "left" => {
    if (!inRect(outer, point)) return "out"

    if (inRect(inner, point)) return "in"

    // Now the point is inside the trapezium
    const [x, y] = point
    if (x <= inner[0][0]) {
      const diffX = x - outer[0][0]
      const diffY = y - outer[0][1]
      const inverseDiffY = outer[3][1] - y
      if (diffX > diffY) return "top"
      else if (diffX > inverseDiffY) return "bottom"
      return "left"
    }
    else if (x >= inner[1][0]) {
      const diffX = outer[1][0] - x
      const diffY = y - outer[1][1]
      const inverseDiffY = outer[2][1] - y
      if (diffX > diffY) return "top"
      else if (diffX > inverseDiffY) return "bottom"
      return "right"
    }
    else {
      const diffY = y - outer[0][1]
      if (diffY <= inner[0][1] - outer[0][1]) return "top"
      else return "bottom"
    }
  }

  const getRectCoordinatesFromEl = (el: HTMLElement) => {
    const x = el.getBoundingClientRect()
    return [
      [x.left, x.top],
      [x.left + x.width, x.top],
      [x.left + x.width, x.top + x.height],
      [x.left, x.top + x.height]
    ]
  }

  const offsetRect = (rect: number[][], offset: number[]) => {
    // offset starts from top and moves clockwise
    // +ve offset = shrinking, -ve offset = expanding
    return [
      [rect[0][0] + offset[3], rect[0][1] + offset[0]],
      [rect[1][0] - offset[1], rect[1][1] + offset[0]],
      [rect[2][0] + offset[1], rect[2][1] - offset[2]],
      [rect[3][0] - offset[3], rect[3][1] - offset[2]]
    ]
  }

  const setPageUrl = () => {
    // using window.history as i want to silently change the route without solid reloading the component
    if (doc().sharing) {
      if (doc().owner === user().id) {
        window.history.replaceState({}, "", `/documents/${doc().id}`)
      }
      else {
        window.history.replaceState({}, "", `/rooms/${doc().roomId}`)
      }
    }
    else {
      window.history.replaceState({}, "", `/documents/${doc().id}`)
    }
  }

  const loadWorkspaces = async () => {
    setDocumentsLoadInfo({ state: ApiState.LOADING })
    setDocuments([])
    const url = formUrl({ basePath: BACKEND_HTTP_BASE_URL, otherPath: "api/workspace/documents", params: { 'x-user-id': getCookie('x-user-id') } })
    const { response, error } = await makeGetCall(url)
    if (error) {
      setDocumentsLoadInfo({ state: ApiState.ERROR, error })
      return
    }
    setDocuments(response.data.documents)
    setDocumentsLoadInfo({ state: ApiState.LOADED })
  }

  // const computeTabDirection = () => {
  //   const value = tabDirection()
  //   const _computeTabDirection = (node: SplitNodeSplit) => {
  //     const { sizes, direction } = splitNodesProps()[node.splitterId]
  //     for (let [index, childNode] of node.children.entries()) {
  //       if (childNode.type === "element") {
  //         const size = sizes[index]
  //         let _direction: TabProps["direction"] = direction === "horizontal" ? "left" : "up"
  //         if (size <= SPLITTER_MIN_SIZE && index === 0) {
  //           _direction = direction === "horizontal" ? "right" : "down"
  //         }
  //         value[childNode.elementId] = _direction
  //       }
  //       else {
  //         _computeTabDirection(childNode)
  //       }
  //     }
  //   }
  //   _computeTabDirection(splitNodes())
  //   setTabDirection({ ...value })
  // }

  const toolbarJsx = () => {
    const _languageDropdownJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <Button variant="outline" {...props}>
              <div class="flex items-center gap-x-1">
                {LANGUAGE_METADATA.get(activeLanguage()).icon({ size: 16 })}
                <div>{LANGUAGE_METADATA.get(activeLanguage()).display}</div>
                <ChevronDownIcon size={16} />
              </div>
            </Button>
          )}
        />
        <DropdownMenuContent class="w-56">
          <For each={LANGUAGES}>
            {(item, index) =>
              <DropdownMenuItem class="cursor-pointer" onClick={e => onLanguageChange(item.id)}>
                <Show when={activeLanguage() === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
                  <CheckIcon size={16} class="mr-2"></CheckIcon>
                </Show>
                <div class="flex items-center gap-x-1">
                  {item.icon({ size: 16 })}
                  {item.display}
                </div>

              </DropdownMenuItem>
            }
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    }

    const _allWorkspacesJsx = () => {
      return <DropdownMenu placement="bottom-start" onOpenChange={onWorkspaceDropdownOpen}>
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <Button class="p-0 shrink-0" variant="link" {...props}>Workspaces</Button>
          )}
        />
        <DropdownMenuContent class="p-3 grid gap-y-3 w-[400px]">
          <Switch>
            <Match when={documentsLoadInfo().state === ApiState.LOADING}>
              <div class="">
                Loading...
              </div>
            </Match>
            <Match when={documentsLoadInfo().state === ApiState.ERROR}>
              <div class="text-red-500">{documentsLoadInfo().error?.message}</div>
            </Match>
            <Match when={documentsLoadInfo().state === ApiState.LOADED}>
              <div class="flex items-center justify-between">
                <div class="font-medium">All workspaces ({documents().length})</div>
                <div class="flex items-center gap-x-3">
                  <div>
                    <SwitchUI class="flex items-center space-x-2" checked={showMyDocuments()} onChange={(e) => setShowMyDocuments(!showMyDocuments())}>
                      <SwitchControl>
                        <SwitchThumb />
                      </SwitchControl>
                      <SwitchLabel class="cursor-pointer text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70">
                        Show only mine
                      </SwitchLabel>
                    </SwitchUI>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <RefreshCcwIcon size={14} onClick={reloadWorkspaces} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div>
                <TextFieldRoot class="w-full">
                  <TextField type="text" placeholder="Search by name/user" value={workspacesSearchText()} onInput={(e) => setWorkspacesSearchText((e.target as any).value.trim())} />
                </TextFieldRoot>
              </div>
              <div>
                <Show when={filteredDocuments().length > 0} fallback={<div class="text-sm">No match found</div>}>
                  <For each={filteredDocuments()}>
                    {(item, index) => <DropdownMenuItem closeOnSelect={false} class="cursor-pointer" onClick={e => onDocumentChange(item)}>
                      <Show when={doc().id === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
                        <CheckIcon size={16} class="mr-2"></CheckIcon>
                      </Show>
                      <div class="w-full flex items-center justify-between">
                        <div>
                          <div>{item.name}</div>
                          <div class="text-xs">{item.owner_name || '-'} {item.owner === user().id ? '(Me)' : ''}</div>
                        </div>
                        {/* <div>
                        <Show when={item.readOnly}>
                          <Tooltip>
                            <TooltipTrigger>
                              <PencilOffIcon size={16} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>No write access</p>
                            </TooltipContent>
                          </Tooltip>
                        </Show>
                      </div> */}
                      </div>

                    </DropdownMenuItem>
                    }
                  </For>
                </Show>

              </div>

            </Match>
          </Switch>

        </DropdownMenuContent>
      </DropdownMenu>
    }

    const _collaboratorsJsx = () => {
      return <Show when={true}>
        <div class="flex items-center gap-x-1">
          <div class="flex -space-x-2">
            <For each={visibleCollaboratorsCircles()}>
              {(item, index) => <div
                class={`relative w-8 h-8 rounded-full ${COLORS[index() % COLORS.length]} flex items-center justify-center text-white font-semibold text-sm border-2 border-white`}
                style={`zIndex: ${visibleCollaboratorsCircles().length - index()}`}
              >
                {(item.name?.[0] || '-').toLocaleUpperCase()}
              </div>}
            </For>
          </div>
          <Show when={totalCollaborators() > visibleCollaboratorsCircles().length}>
            <DropdownMenu placement="bottom-start" onOpenChange={onWorkspaceDropdownOpen}>
              <DropdownMenuTrigger
                as={(props: DropdownMenuSubTriggerProps) => (
                  <Button class="p-0 shrink-0" variant="link" {...props}>+{totalCollaborators() - visibleCollaboratorsCircles().length} more</Button>
                )}
              />
              <DropdownMenuContent class="p-3 grid gap-y-3 w-[400px]">
                <div class="flex items-center justify-between">
                  <div class="font-medium">Live collaborators ({totalCollaborators()})</div>
                </div>
                <div>
                  <TextFieldRoot class="w-full">
                    <TextField type="text" placeholder="Search by name" value={collaboratorsSearchText()} onInput={(e) => setCollaboratorsSearchText((e.target as any).value.trim())} />
                  </TextFieldRoot>
                </div>
                <div>
                  <Show when={filteredCollaborators().length > 0} fallback={<div class="text-sm">No match found</div>}>
                    <For each={filteredCollaborators()}>
                      {(item, index) => <DropdownMenuItem closeOnSelect={false} class="flex items-center gap-x-2">
                        <div>
                          <div class={`text-xs relative w-6 h-6 rounded-full ${COLORS[index() % COLORS.length]} flex items-center justify-center text-white font-semibold border border-white`}
                            style={`zIndex: ${visibleCollaboratorsCircles().length - index()}`}
                          >
                            {(item.name?.[0] || '-').toLocaleUpperCase()}
                          </div>
                        </div>
                        <div class="w-full flex items-center justify-between">
                          <div class="flex gap-x-1">
                            <span>{item.name || '-'}</span>
                            <span>{user().id === item.id ? '(Me)' : ''}</span>
                          </div>
                        </div>

                      </DropdownMenuItem>
                      }
                    </For>
                  </Show>

                </div>

              </DropdownMenuContent>
            </DropdownMenu>
          </Show>
        </div>

      </Show>
    }

    const _shareJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <Button variant="outline" {...props} class={doc().sharing ? 'bg-primary/10 hover:bg-primary/5' : ''}>
              <div class="relative inline-block">
                <div class="flex items-center gap-x-2">
                  <Share2Icon size="16" />
                  <div>Share</div>
                </div>
                <Show when={doc().sharing}>
                  <div class="absolute -bottom-3 -right-5 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold border-2 bg-primary text-primary-foreground">
                    {totalCollaborators()}
                  </div>
                </Show>
              </div>
            </Button>
          )}
        />
        <DropdownMenuContent class="p-3 grid gap-y-3 w-[400px]">
          <div class="font-medium">Multiplayers</div>
          <div class="grid gap-y-3">
            <Show when={role() === Role.OWNER}>
              <div class="flex justify-between">
                <div class="flex items-center gap-x-3">
                  <div><GlobeIcon size={24} /></div>
                  <div>
                    <div class="font-medium">Private join link</div>
                    <div class="text-xs">Allow others access to this workspace</div>
                  </div>
                </div>
                <div>
                  <SwitchUI checked={doc().sharing} onChange={(e) => toggleSharing()}>
                    <SwitchControl >
                      <SwitchThumb />
                    </SwitchControl>
                  </SwitchUI>
                </div>
              </div>
            </Show>


            <Show when={doc().sharing}>
              <div class="bg-primary/20 h-[1px] -ml-3 -mr-3"></div>
              <div>
                <TextFieldRoot class="w-full">
                  <TextFieldLabel>My name</TextFieldLabel>
                  <div class="relative">
                    <TextField type="text" placeholder="Amazing you" value={user().name} onInput={(e) => onUserNameChange((e.target as any).value)} />
                    {/* <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <Loader2Icon class="h-4 w-4 animate-spin text-gray-400" />
                    </div> */}
                  </div>
                </TextFieldRoot>
              </div>

              {/* <div class="flex items-center gap-x-2">
                <div class="font-medium text-sm">Allow others to edit</div>
                <SwitchUI class="mt-1" checked={readOnly()} onChange={(e) => toogleDocReadOnly()}>
                  <SwitchControl >
                    <SwitchThumb />
                  </SwitchControl>
                </SwitchUI>
              </div> */}

              {/* <div class="flex items-center gap-x-2">
                <div class="font-medium text-sm">Sync run/debug sessions</div>
                <SwitchUI class="mt-1" checked={syncRunSession()} onChange={(e) => setSyncRunSession(!syncRunSession())}>
                  <SwitchControl >
                    <SwitchThumb />
                  </SwitchControl> 
                </SwitchUI>
              </div> */}

              <div class="flex items-center text-sm">
                <div class="w-full rounded-tl-[6px] rounded-bl-[6px] bg-secondary">
                  <TextFieldRoot class="w-full">
                    <TextField type="text" readOnly value={roomLink()} />
                  </TextFieldRoot>
                </div>
                <div class={"shrink-0 flex items-center p-2 gap-x-2 bg-primary/20 rounded-tr-[6px] rounded-br-[6px] " + (!isRoomLinkCopied() ? 'cursor-pointer' : '')} onClick={() => !isRoomLinkCopied() && copyRoomLink()}>
                  <LinkIcon size={16} />
                  <div>{isRoomLinkCopied() ? 'Copied!' : 'Copy Link'}</div>
                </div>
              </div>
              <Show when={role() == Role.OWNER}>
                <div class="flex items-center gap-x-1">
                  <div class="text-xs">Want to revoke access to this link?</div>
                  <a class={"text-xs font-medium " + (!isNewRoomLinkGenerated() ? 'cursor-pointer' : '')} onClick={() => !isNewRoomLinkGenerated() && generateNewRoomLink()}>{isNewRoomLinkGenerated() ? 'New link generated!' : 'Generate a new link'}</a>
                </div>
              </Show>

            </Show>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    }

    const _layoutsJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <div class="flex items-center" {...(props as any)} >
              <LayoutDashboardIcon class="cursor-pointer" size={18} />
            </div>
          )}
        />
        <DropdownMenuContent class="p-3 grid gap-y-3">
          <div class="font-medium">Layouts</div>
        </DropdownMenuContent>
      </DropdownMenu>
    }


    const _settingsJsx = () => {
      const fontSizes = [
        "12px", "13px", "14px", "15px", "16px", "17px", "18px", "19px", "20px", "21px"
      ]
      const tabSizes = ['2 spaces', '4 spaces']
      const _menuDropdown = (options: any[], value: any, onChange) => {
        return <Combobox
          options={options}
          value={value}
          onChange={(e) => onChange(e)}
          itemComponent={props => <ComboboxItem class="p-1 cursor-pointer" item={props.item}>{props.item.rawValue}</ComboboxItem>}
        >
          <ComboboxTrigger>
            <div class="text-sm mr-2">{value}</div>
          </ComboboxTrigger>
          <ComboboxContent class="min-w-[auto]" />
        </Combobox>
      }

      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <div class="flex items-center" {...(props as any)} >
              <SettingsIcon size={18} />
            </div>
          )}
        />
        <DropdownMenuContent class="p-3 grid gap-y-3 min-w-[250px]">
          <div class="font-medium">Settings</div>
          <div class="grid gap-y-3">
            <div class="flex items-center justify-between gap-2">
              <div class="font-medium text-sm">Theme</div>
              <div>
                {_menuDropdown(['Light', 'Dark'], 'Light', (e) => console.log(e))}
              </div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="font-medium text-sm">Font size</div>
              <div>
                {_menuDropdown(fontSizes, '12px', (e) => console.log(e))}
              </div>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="font-medium text-sm">Tab size</div>
              <div>
                {_menuDropdown(tabSizes, '2 spaces', (e) => console.log(e))}
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    }


    const _accountJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <div class="flex items-center" {...(props as any)} >
              <CircleUserRound size={18} />
            </div>
          )}
        />
        <DropdownMenuContent class="p-3 grid gap-y-3 min-w-[250px]">
          <div>
            <TextFieldRoot class="w-full">
              <TextFieldLabel>My name</TextFieldLabel>
              <TextField type="text" placeholder="Amazing you" value={user().name} onInput={(e) => onUserNameChange((e.target as any).value)} />
            </TextFieldRoot>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    }

    return <div class='shrink-0 flex justify-between items-center px-5 py-2 gap-x-3'>
      {/* Logo */}
      <div class="flex items-center gap-x-3">
        <div class="h-5 flex items-center">
          <img src='https://leetcode.com/_next/static/images/logo-ff2b712834cf26bf50a5de58ee27bcef.png' class='h-full mr-2'></img>
          <Separator orientation="vertical" />
        </div>
        <div class="w-full max-w-[250px] ml-2">
          <TextFieldRoot class="w-full">
            <TextField type="text" placeholder="Type your doc name..." class="bg-background" value={doc().name} onInput={(e) => onDocNameUpdate(e.currentTarget.value)} />
          </TextFieldRoot>
        </div>
        {_allWorkspacesJsx()}
      </div>

      {/* Language selection */}
      <div class="w-[250px]">
        {_languageDropdownJsx()}
      </div>

      {/* Run icons */}
      <div class="flex gap-1">
        <Show when={awareness().console?.runInfo?.state === ApiState.LOADING} fallback={
          <Tooltip>
            <TooltipTrigger>
              <div class="p-1 cursor-pointer hover:bg-gray-300 rounded-sm" onClick={runCode}>
                {/* @ts-ignore */}
                <RunIcon width="18" class="cursor-pointer" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Run</p>
            </TooltipContent>
          </Tooltip>
        }>
          <Tooltip>
            <TooltipTrigger>
              <div class="p-1 cursor-pointer hover:bg-gray-300 rounded-sm" onClick={rerunCode}>
                {/* @ts-ignore */}
                <ReRunIcon width="18" class="cursor-pointer" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rerun</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <div class="p-1 cursor-pointer hover:bg-gray-300 rounded-sm" onClick={stopCodeExecution}>
                {/* @ts-ignore */}
                <StopIcon width="18" class="cursor-pointer" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stop</p>
            </TooltipContent>
          </Tooltip>


        </Show>
      </div>

      {/* Share & Settin`gs */}
      <div class="flex gap-x-4">
        {_collaboratorsJsx()}
        {_shareJsx()}
        {/* {_layoutsJsx()} */}
        {/* {_settingsJsx()} */}
        {_accountJsx()}
      </div>
    </div>
  }

  const _consoleJsx = () => {
    return <div class="bg-white h-full flex flex-col">
      <Show when={awareness().console} fallback={<div class="h-full flex items-center justify-center text-sm">Please execute the code first</div>}>
        <div class="flex items-center gap-x-2" style="border-bottom: 1px solid gray">
          <div class="flex gap-x-2 p-1 shrink-0">
            <Show when={awareness().console?.runInfo?.state === ApiState.LOADING} fallback={
              <div class="p-1 cursor-pointer hover:bg-gray-300 rounded-sm" onClick={runCode}>
                {/* @ts-ignore */}
                <RunIcon width="14" class="cursor-pointer" />
              </div>
            }>
              <div class="p-1 cursor-pointer hover:bg-gray-300 rounded-sm" onClick={rerunCode}>
                {/* @ts-ignore */}
                <ReRunIcon width="14" class="cursor-pointer" />
              </div>
              <div class="p-1 cursor-pointer hover:bg-gray-300 rounded-sm" onClick={stopCodeExecution}>
                {/* @ts-ignore */}
                <StopIcon width="14" class="cursor-pointer" />
              </div>
            </Show>
          </div>
          <div class="flex justify-center grow">
            <Show when={awareness().console}>
              <div class="flex gap-x-1">
                {/* @ts-ignore */}
                <Show when={awareness().console.runLoadInfo?.state === ApiState.LOADING} fallback={LANGUAGE_METADATA.get(awareness().console.language).icon({ size: 14 })}>
                  {/* @ts-ignore */}
                  {LANGUAGE_METADATA.get(awareness().console.language).runningIcon({ size: 14 }) || LANGUAGE_METADATA.get(awareness().console.language).icon({ size: 14 })}
                </Show>
                <div class="text-sm">{LANGUAGE_METADATA.get(awareness().console.language).display}</div>
              </div>
            </Show>
          </div>
        </div>
        <div class="flex grow overflow-auto">
          <div class="shrink-0 flex flex-col gap-y-1 p-1 p-y-2" style="border-right: 1px solid gray">
            <Tooltip>
              <TooltipTrigger>
                <div class="cursor-pointer hover:bg-gray-300 p-1 rounded-sm" onClick={scrollToEnd}>
                  <ArrowDownNarrowWideIcon width="14" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Scroll to bottom</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <div class="cursor-pointer hover:bg-gray-300 p-1 rounded-sm" onClick={scrollToTop}>
                  <ArrowUpNarrowWideIcon width="14" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Scroll to top</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <div class={"cursor-pointer hover:bg-gray-300 p-1 rounded-sm " + (consoleWrap() ? 'bg-gray-300' : '')} onClick={wrapConsoleText}>
                  <WrapText width="14" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Soft wrap</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger>
                <div class="cursor-pointer hover:bg-gray-300 p-1 rounded-sm" onClick={clearConsole}>
                  <Trash2Icon width="14" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <div ref={setConsoleContainerRef} class={"grow overflow-auto p-1 px-2"} onScroll={(event) => {
            const div = event.target;
            const atBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 5
            setIsAtBottomOfConsole(atBottom);
          }}>
            <pre class={(consoleWrap() ? 'whitespace-pre-wrap break-words' : '')}>
              {awareness().console.output.map((x) => <span class={x.stream === "stderr" ? 'text-red-600' : ''}>
                {x.data}
              </span>)}
            </pre>
          </div>
        </div>
      </Show>
    </div>
  }

  const recursiveLayout = (node: SplitNode) => {
    const _getPane = (item: SplitNodeElement) => <div class="w-full h-full">
        <Pane
          id={item.paneId}
          class={`border border-solid border-gray-300 ${!paneInFullScreen() || paneInFullScreen() === item.paneId ? '' : 'hidden'}`}
          // direction={tabDirection()['whiteboard']}
          inFullScreenMode={paneInFullScreen() === item.paneId}
          tabs={panePropsMap()[item.paneId].tabs.map((x) => ({ ...TABS_METADATA[x.type], icon: TABS_METADATA[x.type].icon(), ...x }))}
          activeTabId={panePropsMap()[item.paneId].activeTabId}
          onTabChange={(tabId) => onTabChange(item.paneId, tabId)}
          toggleFullScreenMode={() => togglePaneFullScreen(item.paneId)}
          toggleExpand={() => togglePaneExpand(item.paneId)}
          onDragStart={(e, tabId) => onPaneDragStart(e, item.paneId, tabId)}
        >
          <Switch>
            <Match when={tabInfoMap()[panePropsMap()[item.paneId].activeTabId].tabType === TabType.WHITEBOARD}>
              {whiteboardJsx}
            </Match>
            <Match when={tabInfoMap()[panePropsMap()[item.paneId].activeTabId].tabType === TabType.CODE_EDITOR}>
              {codeJsx}
            </Match>
            <Match when={tabInfoMap()[panePropsMap()[item.paneId].activeTabId].tabType === TabType.CONSOLE}>
              {consoleJsx}
            </Match>
            {/* <Match when={tabInfoMap()[panePropsMap()[item.paneId].activeTabId].tabType === TabType.DUMMY}>
              <div class="w-full h-full bg-white">Dummy</div>
            </Match> */}
          </Switch>
        </Pane>
      </div>
  
    return <Show when={node.type === "splitter"} fallback={_getPane(node as SplitNodeElement)}>
      <SplitPane
        direction={splitterPropsMap()[(node as SplitNodeSplitter).splitterId].direction}
        sizes={splitterPropsMap()[(node as SplitNodeSplitter).splitterId].sizes}
        minSize={paneInFullScreen() ? 0 : SPLITTER_MIN_SIZE}
        gutterSize={paneInFullScreen() ? 0 : SPLITTER_GUTTER_SIZE}
        onDragEnd={(sizes) => onSplitterDragEnd((node as SplitNodeSplitter).splitterId, sizes)}
        ref={(r) => splitterRefs[(node as SplitNodeSplitter).splitterId] = r}
      >
        <For each={(node as SplitNodeSplitter).children}>
          {(item: SplitNode, index) => {
            if (item.type === "splitter") {
              return recursiveLayout(item)
            }

            return _getPane(item)
          }}
        </For>
      </SplitPane>
    </Show>  
    
  }

  const bodyJsx = () => {
    return <div class={`drop-boundary grow mx-[10px] mb-[10px] overflow-auto flex flex-col gap-2 relative`} >
      {/* Global drag drop anchors */}
      <Show when={isDragging()}>
        <div class="absolute bg-blue-600" style="width: 150px; height: 5px; border-bottom-left-radius: 500px; border-bottom-right-radius: 500px; left: 50%; transform: translateX(-50%); z-index: 1001"></div>
        <div class="absolute bg-blue-600" style="width: 5px; height: 150px; border-top-left-radius: 500px; border-bottom-left-radius: 500px; top: 50%; right: 0%; transform: translateY(-50%); z-index: 1001"></div>
        <div class="absolute bg-blue-600" style="width: 150px; height: 5px; border-top-left-radius: 500px; border-top-right-radius: 500px; bottom: 0%; left: 50%; transform: translateX(-50%); z-index: 1001"></div>
        <div class="absolute bg-blue-600" style="width: 5px; height: 150px; border-top-right-radius: 500px; border-bottom-right-radius: 500px; top: 50%; left: 0%; transform: translateY(-50%); z-index: 1001"></div>
      </Show>

      {recursiveLayout(splitNodes())}
    </div>
  }

  // variables
  const [yDoc, setYDoc] = createSignal<Y.Doc>(new Y.Doc())
  const [yAwareness, setYAwareness] = createSignal<Y.Doc>(new Y.Doc())
  const [doc, setDoc] = createSignal<Doc>()
  const [awareness, setAwareness] = createSignal<Awareness>()
  setupYjsEvents()
  window['doc'] = yDoc()
  window['awareness'] = yAwareness()

  const params = useParams()
  const navigate = useNavigate();
  const [socket, setSocket] = createSignal<WebSocket>()
  const [socketLoadInfo, setSocketLoadInfo] = createSignal<ApiLoadInfo>()
  const [socketRetryCount, setSocketRetryCount] = createSignal<number>(0)
  const [pageLoadApiInfo, setPageLoadApiInfo] = createSignal<ApiLoadInfo>({ state: ApiState.LOADING })
  const [user, setUser] = createSignal<any>()
  const [role, setRole] = createSignal<Role>()

  const [documentsLoadInfo, setDocumentsLoadInfo] = createSignal<ApiLoadInfo>({ state: ApiState.NOT_LOADED })
  const [documents, setDocuments] = createSignal([])
  const [showMyDocuments, setShowMyDocuments] = createSignal(false)
  const [workspacesSearchText, setWorkspacesSearchText] = createSignal("")

  const [collaboratorsSearchText, setCollaboratorsSearchText] = createSignal("")

  const [isRoomLinkCopied, setIsRoomLinkCopied] = createSignal(false)
  const [isNewRoomLinkGenerated, setIsNewLinkGenerated] = createSignal(false)

  const [paneInFullScreen, setPaneInFullScreen] = createSignal<string>()
  const [consoleContainerRef, setConsoleContainerRef] = createSignal<any>()
  const [consoleWrap, setConsoleWrap] = createSignal<boolean>()
  const [showRerunCodeModal, setShowRerunCodeModal] = createSignal(false)
  const [showRerunCodeModalAlert, setShowRerunCodeModalAlert] = createSignal(true)
  const [isAtBottomOfConsole, setIsAtBottomOfConsole] = createSignal(true)

  const activeLanguage = createMemo(() => doc()?.activeLanguage)

  const whiteboardJsx = <Show when={pageLoadApiInfo().state === ApiState.LOADED}>
    <Whiteboard yWhiteboard={(yDoc().getMap().get("whiteboard")) as WhiteboardProps["yWhiteboard"]} />
  </Show>

  const codeJsx = <Show when={pageLoadApiInfo().state === ApiState.LOADED}>
    <CodeEditor language={activeLanguage()} yCode={(yDoc().getMap<any>().get("languageCodeMap")).get(activeLanguage())} />
  </Show>

  const consoleJsx = <Show when={pageLoadApiInfo().state === ApiState.LOADED}>
    {_consoleJsx()}
  </Show>

  // This only holds the structure of the splitters
  const [splitNodes, setSplitNodes] = createSignal<SplitNode>({
    type: "splitter",
    splitterId: "1",
    children: [
      { type: "pane", paneId: "1" },
      {
        type: "splitter", splitterId: "2", children: [
          { type: "pane", paneId: "2" },
          { type: "pane", paneId: "3" },
        ]
      }
    ]
  })
  // This holds the props for all splitters
  const [splitterPropsMap, setSplitterPropsMap] = createSignal<SplitterPropsMap>({
    "1": { direction: "horizontal", sizes: [50, 50], storedSizes: [50, 50] },
    "2": { direction: "vertical", sizes: [50, 50], storedSizes: [50, 50] },
  })
  // This holds the reference to all splitter component refs
  // TODO: Manage cleanup of deleted refs
  const splitterRefs: {[splitterId: string]: any} = {}

  // This holds the props for all panes
  const [panePropsMap, setPanePropsMap] = createSignal<PanePropsMap>({
    "1": { tabs: [{ id: "1", type: TabType.WHITEBOARD }], activeTabId: "1"}, // { id: "1.1", type: TabType.DUMMY }], activeTabId: "1" },
    "2": { tabs: [{ id: "2", type: TabType.CODE_EDITOR }], activeTabId: "2" },
    "3": { tabs: [{ id: "3", type: TabType.CONSOLE }], activeTabId: "3" },
  })

  // Holds the collapse/expand arrow direction for tabs
  // const [tabDirection, setTabDirection] = createSignal<{ [key: string]: PaneProps["direction"] }>({ whiteboard: "left", code: "up", console: "up" })

  // drag drop related variables
  const [isDragging, setIsDragging] = createSignal(false)
  const [draggedItem, setDraggedItem] = createSignal<DraggedItem>(null)
  const [dropTarget, setDropTarget] = createSignal<DropTarget>(null)
  // TODO: add cleanup for els that are no longer in dom
  let lastDropTargetEl: HTMLElement | null = null

  // computed variables
  const pageLoaded = createMemo(() => pageLoadApiInfo().state === ApiState.LOADED)
  const filteredDocuments = createMemo(() => documents()
    .map((document) => document.id === doc().id ?
      { ...document, name: doc().name, owner_name: awareness().collaborators[Object.keys(awareness().collaborators).find((x) => x === document.owner)]?.name || document.owner_name }
      : document
    )
    .filter((document) => !showMyDocuments() ? true : document.owner === user().id)
    .filter((document) => !workspacesSearchText() ? true : document.name.toLocaleLowerCase().includes(workspacesSearchText().toLocaleLowerCase()) || document.owner_name.toLocaleLowerCase().includes(workspacesSearchText().toLocaleLowerCase()))
  )

  const totalCollaborators = createMemo(() => pageLoaded() ? Object.keys(awareness().collaborators).length : 0)
  const roomLink = createMemo(() => pageLoaded() ? `${window.location.origin}/rooms/${doc().roomId}` : "")
  const visibleCollaboratorsCircles = createMemo(() => pageLoaded() ? Object.keys(awareness().collaborators)
    .map((a) => awareness().collaborators[a])
    .sort((a, b) => new Date(a.joinedOn).getTime() - new Date(b.joinedOn).getTime())
    .slice(0, 3)
    : []
  )
  const filteredCollaborators = createMemo(() => pageLoaded() ? Object.keys(awareness().collaborators)
    .map((a) => awareness().collaborators[a])
    .sort((a, b) => new Date(a.joinedOn).getTime() - new Date(b.joinedOn).getTime())
    .filter((collaborator) => !collaboratorsSearchText() ? true : (collaborator.name || '-').toLocaleLowerCase().includes(collaboratorsSearchText().toLocaleLowerCase()))
    : []
  )
  const tabInfoMap = createMemo<{ [tabId: string]: { id: string, paneId: string, tabType: TabType } }>(() => {
    const x = {}
    for (let paneId of Object.keys(panePropsMap())) {
      for (let tab of panePropsMap()[paneId].tabs) {
        x[tab.id] = { id: tab.id, paneId, tabType: tab.type }
      }
    }
    return x
  })

  // events
  setupSocket()

  onMount((() => {
    // computeTabDirection()
  }))

  const reconnect = () => {
    setSocketRetryCount(0)
    setupSocket()
  }

  // toolbar events
  const onDocNameUpdate = (name: string) => {
    yDoc().transact(() => {
      yDoc().getMap().set('name', name)
    }, { type: 'updateDocName' })
  }

  const onDocumentChange = (document: any) => {
    if (document.id == doc().id) {
      return
    }
    window.location.href = `/documents/${document.id}`;
  }

  const onWorkspaceDropdownOpen = async () => {
    if ([ApiState.LOADING, ApiState.LOADED].includes(documentsLoadInfo().state)) {
      return
    }
    await loadWorkspaces()
  }

  const reloadWorkspaces = async () => {
    if ([ApiState.LOADING].includes(documentsLoadInfo().state)) {
      return
    }
    await loadWorkspaces()
  }

  const onLanguageChange = (language: Language) => {
    yDoc().transact(() => {
      yDoc().getMap().set("activeLanguage", language)
      const languageCodeMap = yDoc().getMap().get("languageCodeMap") as Y.Map<Y.Text>
      if (!languageCodeMap.has(language)) {
        languageCodeMap.set(language, new Y.Text(""))
      }
    }, { type: 'updateLanguage' })
  }

  const toggleSharing = () => {
    yDoc().transact(() => {
      let sharing = !doc().sharing
      yDoc().getMap().set("sharing", sharing)
      if (sharing && !doc().roomId) {
        yDoc().getMap().set("roomId", crypto.randomUUID())
      }
    }, { type: 'toggleSharing' })
    setPageUrl()
  }

  const onUserNameChange = (name: string) => {
    setUser({ ...user(), name: name });
    yAwareness().transact(() => {
      (yAwareness().getMap().get("collaborators") as Y.Map<any>).get(user().id).set("name", name)
    }, { type: 'updateUserName' })
  }

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink())
      setIsRoomLinkCopied(true)
      setTimeout(() => setIsRoomLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy text')
      console.error(error)
    }
  }

  const generateNewRoomLink = () => {
    yDoc().transact(() => {
      yDoc().getMap().set("roomId", crypto.randomUUID())
    }, { type: 'changeRoomLink' })
    setIsNewLinkGenerated(true)
    setTimeout(() => setIsNewLinkGenerated(false), 2000)
    setPageUrl()
  }

  // splitter events
  const onSplitterDragEnd = (splitterId: string, sizes: number[]) => {
    console.log(splitterId, sizes)
    batch(() => {
      splitterPropsMap()[splitterId].sizes = sizes
      splitterPropsMap()[splitterId].storedSizes = [...sizes]
      setSplitterPropsMap({ ...splitterPropsMap() })
      // computeTabDirection()
    })
  }

  // Pane events
  const onTabChange = (paneId: string, tabId: string) => {
    panePropsMap()[paneId].activeTabId = tabId
    setPanePropsMap({...panePropsMap()})
  }

  const togglePaneFullScreen = (paneId: string) => {
    batch(() => {
      console.log('togglePaneFullScreen', paneId)
      if (isNullOrUndefined(paneInFullScreen())) {
        setPaneInFullScreen(paneId)
        enableFullScreen()
      }
      else {
        setPaneInFullScreen(null)
        disableFullScreen()
      }
    })
   
  }

  const togglePaneExpand = (paneId: string) => {

  }

  const onPaneDragStart = (event: MouseEvent, paneId: string, tabId?: string) => {
    console.log('onPaneDragStart', paneId, tabId, event);
    batch(() => {
      document.body.classList.add('dragging')
      setIsDragging(true)
      setDraggedItem({ type: tabId ? "tab" : "pane", paneId, tabId })
    })
  }

  const findSplitter = (node: SplitNodeSplitter, splitterId: string): SplitNodeSplitter => {
    if (node.splitterId === splitterId) {
      return node
    }

    for (let childNode of node.children) {
      if (childNode.type === "splitter") {
        const x = findSplitter(childNode, splitterId)
        if (x) {
          return x
        }
      }
    }
  }

  const findParentSplitter = (node: SplitNodeSplitter, splitterId: string): SplitNodeSplitter => {
    for (let childNode of node.children) {
      if (childNode.type === "splitter") {
        if (childNode.splitterId === splitterId) {
          return node
        }
        const x = findParentSplitter(childNode, splitterId)
        if (x) {
          return x
        }
      }
    }
  }

  const findPaneSplitter = (node: SplitNode, paneId: string): SplitNodeSplitter | null => { 
    if (node.type === "pane") {
      return
    }

    for (let childNode of node.children) {
      if (childNode.type === "pane" && childNode.paneId === paneId) {
        return node
      }
      const x = findPaneSplitter(childNode, paneId)
      if (x) {
        return x
      }
    }
  }

  const cleanupNodes = (_splitNodes: SplitNode, _splitterPropsMap: SplitterPropsMap): SplitNode => {
    const _removeSingleChild = (node: SplitNode): SplitNode => {
      if (node.type === "pane") {
        return node
      }
  
      // Cleanup child nodes
      for (let [index, childNode] of node.children.entries()) {
        if (childNode.type === "splitter") {
          node.children[index] = _removeSingleChild(childNode)
        }  
      }
  
      // Clean up parent node
      if (node.children.length === 1) {
        delete _splitterPropsMap[node.splitterId]
        return node.children[0]
      }

      return node
    }

    const _removeRedundantSplitters = (node: SplitNode) => {
      if (node.type === "pane") {
        return
      }

      for (let i=0; i<node.children.length;) {
        const childNode = node.children[i];
        if (childNode.type === "splitter") {
          _removeRedundantSplitters(childNode)
          if (_splitterPropsMap[childNode.splitterId].direction === _splitterPropsMap[node.splitterId].direction) {
            node.children.splice(i, 1, ...childNode.children)
            _splitterPropsMap[node.splitterId].sizes.splice(i, 1, ..._splitterPropsMap[childNode.splitterId].sizes.map((x) => (x/100)*_splitterPropsMap[node.splitterId].sizes[i]))
            _splitterPropsMap[node.splitterId].storedSizes.splice(i, 1, ..._splitterPropsMap[childNode.splitterId].storedSizes.map((x) => (x/100)*_splitterPropsMap[node.splitterId].storedSizes[i]))
            if (_splitterPropsMap[node.splitterId].sizes.length !== node.children.length) {
              debugger
            }
            delete _splitterPropsMap[childNode.splitterId]
            i += (childNode.children.length - 1)
          }
        }
        i += 1;
      }
    }
   
    _splitNodes = _removeSingleChild(_splitNodes) as SplitNodeSplitter
    _removeRedundantSplitters(_splitNodes)
    for (let splitterId of Object.keys(splitterRefs)) {
      if (!_splitterPropsMap[splitterId]) {
        delete splitterRefs[splitterId]
      }
    }
    return _splitNodes
  }

  const newLayout = () => {
    if (!dropTarget()) {
      // TODO: Why is this happeneing
      return
    }

    const to = dropTarget().to
    const _draggedItem = draggedItem()

    let _splitNodes = splitNodes()
    let _splitterPropsMap = splitterPropsMap()
    let _panePropsMap = panePropsMap()

    if (!to) {
      if (_draggedItem.type === "tab") {
        _panePropsMap[_draggedItem.paneId].activeTabId = _draggedItem.tabId
        setPanePropsMap({..._panePropsMap})
      }
      return
    }

    // splitNodes()
    // splitterPropsMap()
    // panePropsMap()
    // splitterRefs

    switch (to.type) {
      case "1": {
        let newNode: SplitNodeElement
        // Delete dragged item from its old position
        if (_draggedItem.type === "tab" && _panePropsMap[_draggedItem.paneId].tabs.length > 1) {
          let paneProps = _panePropsMap[_draggedItem.paneId]
          paneProps.tabs = paneProps.tabs.filter((x) => x.id !== _draggedItem.tabId)
          if (paneProps.activeTabId === _draggedItem.tabId) {
            paneProps.activeTabId = paneProps.tabs[paneProps.tabs.length - 1].id
          }
          newNode = {
            type: "pane", paneId: crypto.randomUUID()
          }
          _panePropsMap[newNode.paneId] = {
            tabs: [{id: _draggedItem.tabId, type: tabInfoMap()[_draggedItem.tabId].tabType}],
            activeTabId: _draggedItem.tabId
          }
        }
        else {
          // Remove the pane from parent splitter
          const parentNode = findPaneSplitter(_splitNodes, _draggedItem.paneId)
          const index = parentNode.children.findIndex((x) => x.type === "pane" && x.paneId === _draggedItem.paneId)
          newNode = parentNode.children.splice(index, 1)[0] as SplitNodeElement
          // Redistribute the sizes
          const {sizes, storedSizes} = _splitterPropsMap[parentNode.splitterId]
          const [size] = sizes.splice(index, 1)
          const [storedSize] = storedSizes.splice(index, 1)
          for (let i=0; i<sizes.length; i++) {
            sizes[i] += (size / sizes.length)
            storedSizes[i] += (storedSize / sizes.length)
          }
        }

        // Add dragged item to ites new position
        _splitNodes = {
          type: "splitter",
          splitterId: crypto.randomUUID(),
          children: (to.insert === "before" ? [newNode, _splitNodes] : [_splitNodes, newNode])
        }
        _splitterPropsMap[_splitNodes.splitterId] = {
          direction: to.direction,
          sizes: (to.insert === "before" ? [25, 75] : [75, 25]),
          storedSizes: (to.insert === "before" ? [25, 75] : [75, 25])
        }
        break
      }
      case "2": {
        const tabsToAdd = []
        // Delete dragged item from its old position
        if (_draggedItem.type === "tab" && _panePropsMap[_draggedItem.paneId].tabs.length > 1) {
          tabsToAdd.push({id: _draggedItem.tabId, type: tabInfoMap()[_draggedItem.tabId].tabType})
          _panePropsMap[to.paneId].activeTabId = _draggedItem.tabId

          let paneProps = _panePropsMap[_draggedItem.paneId]
          paneProps.tabs = paneProps.tabs.filter((x) => x.id !== _draggedItem.tabId)
          if (paneProps.activeTabId === _draggedItem.tabId) {
            paneProps.activeTabId = paneProps.tabs[paneProps.tabs.length - 1].id
          }
        }
        else {
          tabsToAdd.push(..._panePropsMap[_draggedItem.paneId].tabs)
          _panePropsMap[to.paneId].activeTabId = _panePropsMap[_draggedItem.paneId].activeTabId
          delete _panePropsMap[_draggedItem.paneId]

          // Remove the pane from parent splitter and add it some place else
          const parentNode = findPaneSplitter(_splitNodes, _draggedItem.paneId)
          const index = parentNode.children.findIndex((x) => x.type === "pane" && x.paneId === _draggedItem.paneId)
          parentNode.children.splice(index, 1)[0] as SplitNodeElement
          // Redistribute the sizes
          const {sizes, storedSizes} = _splitterPropsMap[parentNode.splitterId]
          const [size] = sizes.splice(index, 1)
          const [storedSize] = storedSizes.splice(index, 1)
          for (let i=0; i<sizes.length; i++) {
            sizes[i] += (size / sizes.length)
            storedSizes[i] += (storedSize / sizes.length)
          }
        }

        // Add dragged item to its new position
        _panePropsMap[to.paneId].tabs.splice(to.index, 0, ...tabsToAdd)
        break
      }
      case "3": {
        let newNode: SplitNodeElement
        // Delete dragged item from its old position
        if (_draggedItem.type === "tab" && _panePropsMap[_draggedItem.paneId].tabs.length > 1) {
          let paneProps = _panePropsMap[_draggedItem.paneId]
          paneProps.tabs = paneProps.tabs.filter((x) => x.id !== _draggedItem.tabId)
          if (paneProps.activeTabId === _draggedItem.tabId) {
            paneProps.activeTabId = paneProps.tabs[paneProps.tabs.length - 1].id
          }
          newNode = {
            type: "pane", paneId: crypto.randomUUID()
          }
          _panePropsMap[newNode.paneId] = {
            tabs: [{id: _draggedItem.tabId, type: tabInfoMap()[_draggedItem.tabId].tabType}],
            activeTabId: _draggedItem.tabId
          }
        }
        else {
          // Remove the pane from parent splitter
          const parentNode = findPaneSplitter(_splitNodes, _draggedItem.paneId)
          const index = parentNode.children.findIndex((x) => x.type === "pane" && x.paneId === _draggedItem.paneId)
          newNode = parentNode.children.splice(index, 1)[0] as SplitNodeElement
          // Redistribute the sizes
          const {sizes, storedSizes} = _splitterPropsMap[parentNode.splitterId]
          const [size] = sizes.splice(index, 1)
          const [storedSize] = storedSizes.splice(index, 1)
          for (let i=0; i<sizes.length; i++) {
            sizes[i] += (size / sizes.length)
            storedSizes[i] += (storedSize / sizes.length)
          }
        }

        // Add dragged item to it's new position
        // parentNode will be empty only when root node is of type element
        let parentNode = findPaneSplitter(_splitNodes, to.paneId)
        const index = parentNode ? parentNode.children.findIndex((x) => x.type === "pane" && x.paneId === to.paneId): null
        let newSplitter: SplitNodeSplitter = {
          type: "splitter",
          splitterId: crypto.randomUUID(),
          children: (to.insert === "before" ? [newNode, parentNode ? parentNode.children[index]: _splitNodes] : [parentNode ? parentNode.children[index]: _splitNodes, newNode])
        }
        _splitterPropsMap[newSplitter.splitterId] = {
          direction: to.direction,
          sizes: [50, 50],
          storedSizes: [50, 50]
        }
        if (parentNode) {
          parentNode.children[index] = newSplitter
        }
        else {
          _splitNodes = newSplitter
        }
        break
      }
    }

    _splitNodes = cleanupNodes(_splitNodes, _splitterPropsMap) as any

    console.log('_splitNodes', _splitNodes)
    console.log('_splitterPropsMap', _splitterPropsMap)
    console.log('_panePropsMap', _panePropsMap)
    console.log('splitterRefs', splitterRefs)
    setSplitNodes({..._splitNodes})
    setSplitterPropsMap({..._splitterPropsMap})
    setPanePropsMap({..._panePropsMap})
  }

  const onPaneDragEnd = (e: MouseEvent) => {
    console.log('onPaneDragEnd', e)
    batch(() => {
      newLayout()

      document.body.classList.remove('dragging')
      setIsDragging(false)
      setDraggedItem(null)
      setDropTarget(null)
    })
  }

  const onPaneDrag = (e: MouseEvent) => {
    // console.log('onPaneDrag', e)

    const point = [e.clientX, e.clientY]

    // Update the psoition of drag handle
    const dragCursorEl: HTMLDivElement = document.querySelector(".drag-cursor")
    if (dragCursorEl) {
      const width = dragCursorEl.getBoundingClientRect().width
      dragCursorEl.style.left = (point[0] - width / 2) + "px"
      dragCursorEl.style.top = (point[1] + 5) + "px"
    }

    // Calculate drop tagets
    let dropBoundaryEl: HTMLElement = document.querySelector(".drop-boundary")
    let dropBoundary = getRectCoordinatesFromEl(dropBoundaryEl)
    const offset = offsetRect(dropBoundary, new Array(4).fill(SPLITTER_MIN_SIZE / 4))

    const x = partInConcentricRect(dropBoundary, offset, point)
    if (x === "out") {
      // console.log('Outside boundary, Keeping the last known drop point', dropPoint())
      return
    }
    else if (x !== "in") {
      let [outerClass, innerClass] = ["border border-solid border-blue-600 rounded-lg", "bg-blue-300 opacity-30"]
      let [outerStyle, innerStyle] = ["", ""]
      const box = dropBoundaryEl.getBoundingClientRect()

      // check edge case
      if ((draggedItem().type === "pane" || panePropsMap()[draggedItem().paneId].tabs.length === 1) && splitNodes().type === "pane") {
        outerStyle = `top: ${box.top}px; left: ${box.left}px; width: ${box.width}px; height: ${box.height}px;`, 
        setDropTarget({
          el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
        })
        return
      }

      switch (x) {
        case "top": {
          outerStyle = `top: ${box.top}px; left: ${box.left}px; width: ${box.width}px; height: ${box.height / 4}px;`
          break
        }
        case "right": {
          outerStyle = `top: ${box.top}px; right: ${window.innerWidth - box.right}px; width: ${box.width / 4}px; height: ${box.height}px;`
          break
        }
        case "bottom": {
          outerStyle = `bottom: ${window.innerHeight - box.bottom}px; right: ${window.innerWidth - box.right}px; width: ${box.width}px; height: ${box.height / 4}px;`
          break
        }
        case "left": {
          outerStyle = `top: ${box.top}px; left: ${box.left}px; width: ${box.width / 4}px; height: ${box.height}px;`
          break
        }
      }
      setDropTarget({
        el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
        to: {type: "1", direction: x === "top" || x === "bottom" ? "vertical" : "horizontal", insert: x === "top" || x === "left" ? "before" : "after" },
      })
      return
    }

    // Function that checks if the cursor is in the pane's header
    const _checkInHeader = (node: SplitNodeElement, parentNode: SplitNodeSplitter) => {
      const paneId = node.paneId;

      const headerGroup: HTMLElement = document.querySelector(`.pane [data-pane-id="${paneId}"].tab-header-group`)
      const headers: HTMLElement[] = Array.from(headerGroup.querySelectorAll(`.tab-header`))

      const groupRect = getRectCoordinatesFromEl(headerGroup)
      const paneOrientation = headerGroup.dataset.paneOrientation

      let [outerClass, innerClass] = ["", "border border-solid border-blue-600 bg-blue-600 rounded-sm"]
      let [outerStyle, innerStyle] = [`${paneOrientation ? 'padding-left: 6px; padding-right: 6px; height: 1px;' : 'padding-top: 6px; padding-bottom: 6px; width: 1px;'}`, ""]

      if (inRect(groupRect, point)) {
        if (!paneOrientation) {
          const __beginingOuterStyle = (header: HTMLElement) => {
            const box = header.getBoundingClientRect()
            const style = `top: ${box.top}px; left: ${box.left}px; height: ${box.height}px;`
            return style
          }

          const __endOuterStyle = (header: HTMLElement) => {
            const box = header.getBoundingClientRect()
            const style = `top: ${box.top}px; right: ${window.innerWidth - box.right}px; height: ${box.height}px;`
            return style
          }
        
          for (let [index, header] of headers.entries()) {
            const box = header.getBoundingClientRect()
            if (point[0] > (box.x + box.width)) {
              continue
            }

            if (point[0] < (box.x + (box.width / 2))) {
              // Drop at beginning of header
              outerStyle += __beginingOuterStyle(header)
              setDropTarget({
                el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
                to: {type: "2", paneId, index}
              })
              console.log(dropTarget())
            }
            else {
              // Drop at beginning of next header
              outerStyle += ((index + 1 < headers.length) ? __beginingOuterStyle(headers[index + 1]) : __endOuterStyle(headers[headers.length - 1]))
              setDropTarget({
                el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
                to: {type: "2", paneId, index: index + 1}
              })
              console.log(dropTarget())
            }
            return true
          }

          // drop at index=length of the header group
          outerStyle += __endOuterStyle(headers[headers.length - 1])
          setDropTarget({
            el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
            to: {type: "2", paneId, index: headers.length}
          })
          console.log(dropTarget())
          return true
        }
        
        // Pane oriented
        const __beginingOuterStyle = (header: HTMLElement) => {
          const box = header.getBoundingClientRect()
          const style = `top: ${box.top}px; left: ${box.left}px; width: ${box.width}px;`
          return style
        }

        const __endOuterStyle = (header: HTMLElement) => {
          const box = header.getBoundingClientRect()
          const style = `bottom: ${window.innerHeight - box.bottom}px; left: ${box.left}px; width: ${box.width}px;`
          return style
        }
      
        for (let [index, header] of headers.entries()) {
          const box = header.getBoundingClientRect()
          if (point[1] > (box.y + box.height)) {
            continue
          }

          if (point[1] < (box.y + (box.height / 2))) {
            // Drop at beginning of header
            outerStyle +=  __beginingOuterStyle(header)
            setDropTarget({
              el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
              to: {type: "2", paneId, index}
            })
            console.log(dropTarget())
          }
          else {
            // Drop at beginning of next header
            outerStyle += ((index + 1 < headers.length) ? __beginingOuterStyle(headers[index + 1]) : __endOuterStyle(headers[headers.length - 1]))
            setDropTarget({
              el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
              to: {type: "2", paneId, index: index + 1}
            })
            console.log(dropTarget())
          }
          return true
        }
      
        // drop at index=length of the header group
        outerStyle += __endOuterStyle(headers[headers.length - 1])
        setDropTarget({
          el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
          to: {type: "2", paneId, index: headers.length}
        })
        console.log(dropTarget())
        return true
      }

      return false;
    }

    const _checkInBody = (node: SplitNodeElement, parent: SplitNodeSplitter) => {
      const paneId = node.paneId
      const body: HTMLElement = document.querySelector(`.pane [data-pane-id="${paneId}"].pane-body`)

      const outerRect = getRectCoordinatesFromEl(body)
      const width = outerRect[1][0] - outerRect[0][0]
      const height = outerRect[2][1] - outerRect[1][1]
      const innerRect = offsetRect(outerRect, [height / 4, width / 4, height / 4, width / 4])
      const x = partInConcentricRect(outerRect, innerRect, point)
      if (x === "out") {
        return false;
      }

      let [outerClass, innerClass] = ["border border-solid border-blue-600 rounded-lg", "bg-blue-300 opacity-30"]
      let [outerStyle, innerStyle] = ["", ""]
      const pane = document.querySelector(`.pane[data-pane-id="${node.paneId}"]`)
      const box = pane.getBoundingClientRect()

      switch (x) {
        case "top": {
          outerStyle = `top: ${box.top}px; left: ${box.left}px; width: ${box.width}px; height: ${box.height / 2}px;`
          break
        }
        case "right": {
          outerStyle = `top: ${box.top}px; right: ${window.innerWidth - box.right}px; width: ${box.width / 2}px; height: ${box.height}px;`
          break
        }
        case "bottom": {
          outerStyle = `bottom: ${window.innerHeight - box.bottom}px; right: ${window.innerWidth - box.right}px; width: ${box.width}px; height: ${box.height / 2}px;`
          break
        }
        case "left": {
          outerStyle = `top: ${box.top}px; left: ${box.left}px; width: ${box.width / 2}px; height: ${box.height}px;`
          break
        }
        case "in": {
          outerStyle = `top: ${box.top}px; left: ${box.left}px; width: ${box.width}px; height: ${box.height}px;`
        }
      }
      setDropTarget({
        el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
        to: x !== "in" ? 
          {type: "3", paneId, direction: x === "top" || x === "bottom" ? "vertical" : "horizontal", insert: x === "top" || x === "left" ? "before" : "after" }
          : {type: "2", paneId, index: panePropsMap()[paneId].tabs.length},
      })
      console.log(dropTarget())
      return true
    }

    // Loop through split nodes and check if the cursor is on them
    const _recursive = (node: SplitNode, parent?: SplitNodeSplitter) => {
      if (node.type === "splitter") {
        for (let child of node.children) {
          if (_recursive(child, node)) {
            return true
          }
        }
        return false
      }

      let found = _checkInHeader(node, parent)
      if (!found) {
        found = _checkInBody(node, parent)
      }
      
      // edge case
      if (found) {
        let item = draggedItem()
        let cond = (item.type === "tab" && node.paneId === item.paneId && panePropsMap()[item.paneId].tabs.length === 1) 
          || 
        (item.type === "pane" && item.paneId === node.paneId)
        if (cond) {
          // reverse old operations
          // only 1 drop point possible
          const pane = document.querySelector(`.pane[data-pane-id="${node.paneId}"]`)
          const box = pane.getBoundingClientRect()
          let [outerClass, innerClass] = ["border border-solid border-blue-600 rounded-lg", "bg-blue-300 opacity-30"]
          let [outerStyle, innerStyle] = [
            `top: ${box.top}px; left: ${box.left}px; width: ${box.width}px; height: ${box.height}px;`, 
            ""
          ]
          setDropTarget({
            el: { outer: { class: outerClass, style: outerStyle }, inner: { class: innerClass, style: innerStyle } },
            // to: {}
          })
        }
      }
      return found
    }

    const found = _recursive(splitNodes())

    if (!found) {
      // If not found inside _recursive, then missed some parts (most likely the gutter). In this case keep the last known droppoint as i
      console.log('No match found, Keeping the last known drop point', dropTarget())
    }
  }

  // Console events
  const runCode = async () => {
    setIsAtBottomOfConsole(true)
    yAwareness().transact(() => {
      const newConsole = new Y.Map()
      newConsole.set("runInfo", { state: ApiState.LOADING })
      newConsole.set("language", activeLanguage())
      newConsole.set("output", new Y.Array())
      yAwareness().getMap().set("console", newConsole)
    }, { type: 'runCode' })
  }

  const rerunCode = () => {
    if (!showRerunCodeModalAlert()) {
      rerunCodeConfirm()
    }
    else {
      setShowRerunCodeModal(true)
    }
  }

  const rerunCodeConfirm = () => {
    setShowRerunCodeModal(false)
    setIsAtBottomOfConsole(true)
    yAwareness().transact(() => {
      const newConsole = new Y.Map()
      newConsole.set("runInfo", { state: ApiState.LOADING })
      newConsole.set("language", activeLanguage())
      newConsole.set("output", new Y.Array())
      yAwareness().getMap().set("console", newConsole)
    }, { type: 'rerunCode' })
  }

  const rerunCodeCancel = () => {
    setShowRerunCodeModal(false)
  }

  const stopCodeExecution = () => {
    yAwareness().transact(() => {
      yAwareness().getMap<any>().get("console").set("runInfo", { state: ApiState.ERROR })
    }, { type: 'stopCode' })
  }

  const scrollToEnd = () => {
    consoleContainerRef().scrollTop = consoleContainerRef().scrollHeight
  }

  const scrollToTop = () => {
    consoleContainerRef().scrollTop = 0
  }

  const wrapConsoleText = () => {
    setConsoleWrap(!consoleWrap())
  }

  const clearConsole = () => {
    yAwareness().transact(() => {
      const output = yAwareness().getMap<any>().get("console").get("output")
      output.delete(0, output.length)
    }, { type: 'clearConsole' })
  }

  // init
  // show loader, establish websocket connection, handle error

  // HTML
  return (
    <>
      <Switch>
        <Match when={pageLoadApiInfo().state === ApiState.LOADING}>
          <PageLoader />
        </Match>
        {/* <Match when={pageLoadApiInfo().state === ApiState.ERROR}>
          <div class="text-red-600">{pageLoadApiInfo().error?.message}</div>
        </Match> */}
        <Match when={pageLoadApiInfo().state === ApiState.LOADED}>
          {/* Ideally we should not event have the onMouseMove listener when not dragging */}
          <div class={`h-full flex flex-col app-bg relative overflow-hidden`} onMouseMove={(e) => isDragging() ? onPaneDrag(e) : null} onMouseUp={(e) => isDragging() ? onPaneDragEnd(e) : null}>
            {/* A overlay added when dragging is on to disable css changes becuase of hover (and other reasons) when draggin is on */}
            <Show when={isDragging()}>
              <div class={`absolute w-full h-full`} style="z-index: 1000; background: transparent"></div>
            </Show>
            {/* drop target */}
            <Show when={isDragging() && dropTarget()}>
              <div class={`drop-target absolute ${dropTarget().el.outer.class || ''}`} style={`z-index: 1000; ${dropTarget().el.outer.style || ''}`}>
                <div class={`w-full h-full ${dropTarget().el.inner.class || ''}`} style={dropTarget().el.inner.style || ''}></div>
              </div>
            </Show>
            {/* Cursor ui while dragging */}
            <Show when={isDragging()}>
              <div class={`drag-cursor absolute`} style="z-index: 1000;">
                <div class="flex items-center gap-1 text-sm flex-row px-2 py-1 bg-white rounded-sm border border-gray-300">
                  <Show when={draggedItem().type === "tab"} fallback={<div class="text-xs">
                    {TABS_METADATA[
                      tabInfoMap()[panePropsMap()[draggedItem().paneId].activeTabId].tabType
                    ].title} and {panePropsMap()[draggedItem().paneId].tabs.length} tabs
                  </div>}>
                    <div >{TABS_METADATA[tabInfoMap()[(draggedItem() as any).tabId].tabType].icon}</div>
                    <div class="">{TABS_METADATA[tabInfoMap()[(draggedItem() as any).tabId].tabType].title}</div>
                  </Show>

                </div>
              </div>
            </Show>

            {toolbarJsx()}
            {bodyJsx()}
          </div>
          {/* Reconnecting */}
          <Show when={socketLoadInfo().state === ApiState.LOADING}>
            <AlertDialog open={socketLoadInfo().state === ApiState.LOADING}>
              <AlertDialogContent style="box-shadow: none; border: none; background: none; outline: none" class="flex justify-center">
                <Reconnecting />
              </AlertDialogContent>
            </AlertDialog>
          </Show>

          {/* Rerun code */}
          <Show when={showRerunCodeModal()}>
            <AlertDialog open={showRerunCodeModal()}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Process {LANGUAGE_METADATA.get(activeLanguage()).fileName} is running</AlertDialogTitle>
                  <AlertDialogDescription>
                    <div>{LANGUAGE_METADATA.get(activeLanguage()).fileName} is not allowed to run in parallel.</div>
                    <div>Would you like to stop this and start a new one?</div>
                    <div class="mt-4">
                      <Checkbox class="flex space-x-2" checked={!showRerunCodeModalAlert()} onChange={() => setShowRerunCodeModalAlert(!showRerunCodeModalAlert())}>
                        <CheckboxControl class="!ml-0" />
                        <CheckboxLabel class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Do not show this dialog in the future
                        </CheckboxLabel>
                      </Checkbox>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogClose onClick={() => rerunCodeCancel()}>Cancel</AlertDialogClose>
                  <AlertDialogAction onClick={() => rerunCodeConfirm()} >Stop and Rerun</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </Show>

        </Match>
      </Switch>



      {/* Error dialog */}
      <Show when={socketLoadInfo().state === ApiState.ERROR}>
        <AlertDialog open={socketLoadInfo().state === ApiState.ERROR}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Failed to connect</AlertDialogTitle>
              <AlertDialogDescription>
                {socketLoadInfo().error.message}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose onClick={() => reconnect()}>Try again</AlertDialogClose>
              <AlertDialogAction onClick={() => window.location.href = "/"}>Go to dashboard</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Show>
    </>
  )
}