import { batch, createEffect, createMemo, createSignal, For, Match, onMount, Show, Switch } from "solid-js"
import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"
import { BACKEND_HTTP_BASE_URL, BACKEND_SOCKET_BASE_URL } from "@/helpers/constants";
import { useNavigate, useParams } from "@solidjs/router";
import { formUrl, isNullOrUndefined, sleep } from "@ide/ts-utils/src/lib/utils";
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
import { Tab, TabProps } from "./Tab";
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
type LanguageMetadata = { id: Language, display: string, fileName: string, icon: any, runningIcon?: any}
type TabType = "whiteboard" | "code" | "console"

type SplitNodeSplit = {
  type: "splitter",
  splitterId: string;
  children: SplitNode[]
}
type SplitNodeElement = {
  type: "element",
  elementId: TabType
}
type SplitNode = SplitNodeSplit | SplitNodeElement
type SplitNodesProps = {
  [splitterId: string]: {
    direction: SplitPaneProps["direction"], sizes: number[], storedSizes: number[]
  }
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

  const computeTabDirection = () => {
    const value = tabDirection()
    const _computeTabDirection = (node: SplitNodeSplit) => {
      const { sizes, direction } = splitNodesProps()[node.splitterId]
      for (let [index, childNode] of node.children.entries()) {
        if (childNode.type === "element") {
          const size = sizes[index]
          let _direction: TabProps["direction"] = direction === "horizontal" ? "left" : "up"
          if (size <= SPLITTER_MIN_SIZE && index === 0) {
            _direction = direction === "horizontal" ? "right" : "down"
          }
          value[childNode.elementId] = _direction
        }
        else {
          _computeTabDirection(childNode)
        }
      }
    }
    _computeTabDirection(splitNodes())
    setTabDirection({ ...value })
  }

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
                          <div class="text-xs">{item.owner_name || '-'}</div>
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
                          <div class={`text-xs relative w-6 h-6 rounded-full ${COLORS[index() % COLORS.length]} flex items-center justify-center text-white font-semibold border-1 border-white`}
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

  const recursiveLayout = (node: SplitNodeSplit) => {
    return <SplitPane
      direction={splitNodesProps()[node.splitterId].direction}
      sizes={splitNodesProps()[node.splitterId].sizes}
      minSize={tabInFullScreen() ? 0 : SPLITTER_MIN_SIZE}
      gutterSize={tabInFullScreen() ? 0 : SPLITTER_GUTTER_SIZE}
      onDragEnd={(e) => onSplitterDragEnd(node.splitterId, e)}
      ref={(r) => splitterRefs[node.splitterId] = r}
    >
      <For each={node.children}>
        {(item: SplitNode, index) => {
          if (item.type === "splitter") {
            return recursiveLayout(item)
          }

          console.log("Re-render")
          return <Switch>
            <Match when={item.elementId === "whiteboard"}>
              <Tab
                class={!tabInFullScreen() || tabInFullScreen() === 'whiteboard' ? '' : 'hidden'}
                direction={tabDirection()['whiteboard']}
                inFullScreenMode={tabInFullScreen() === 'whiteboard'}
                tabs={[{ id: 'whiteboard', icon: <CodeXmlIcon size={16} />, title: 'Whiteboard' }]}
                activeTabId="whiteboard"
                toggleFullScreenMode={() => toggleTabFullScreen("whiteboard")}
                toggleExpandCollapse={() => toggleTabExpandCollapse("whiteboard")}
              >
                {whiteboardJsx}
              </Tab>
            </Match>
            <Match when={item.elementId === "code"}>
              <Tab
                class={!tabInFullScreen() || tabInFullScreen() === 'code' ? '' : 'hidden'}
                direction={tabDirection()['code']}
                tabs={[{ id: 'code', icon: <CodeXmlIcon size={16} />, title: 'Code' }]}
                activeTabId="code"
                toggleFullScreenMode={() => toggleTabFullScreen("code")}
                toggleExpandCollapse={() => toggleTabExpandCollapse("code")}
              >
                {codeJsx}
              </Tab>
            </Match>
            <Match when={item.elementId === "console"}>
              <Tab
                class={!tabInFullScreen() || tabInFullScreen() === 'console' ? '' : 'hidden'}
                direction={tabDirection()['console']}
                tabs={[{ id: 'console', icon: <CirclePlayIcon size={16} />, title: 'Console' }]}
                activeTabId="console"
                toggleFullScreenMode={() => toggleTabFullScreen("console")}
                toggleExpandCollapse={() => toggleTabExpandCollapse("console")}
              >
                {consoleJsx}
              </Tab>
            </Match>
          </Switch>
        }}
      </For>
    </SplitPane>
  }

  const bodyJsx = () => {
    return <div class='grow px-[10px] pb-[10px] overflow-auto flex flex-col gap-2'>
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

  const [tabInFullScreen, setTabInFullScreen] = createSignal<TabType | null>()
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

  // This only holds the structure of the panes
  const [splitNodes, setSplitNodes] = createSignal<SplitNodeSplit>({
    type: "splitter", 
    splitterId: "1",
    children: [
      { type: "element", elementId: "whiteboard" },
      {
        type: "splitter", splitterId: "2", children: [
          { type: "element", elementId: "code" },
          { type: "element", elementId: "console" },
        ]
      }
    ]
  })
  // This holds the props for all panes
  const [splitNodesProps, setSplitNodeProps] = createSignal<SplitNodesProps>({
    "1": { direction: "horizontal", sizes: [50, 50], storedSizes: [50, 50] },
    "2": { direction: "vertical", sizes: [50, 50], storedSizes: [50, 50] },
  })
  // This holds references for all panes
  // Right now no panes are deleted, so not worrying about cleanup
  const splitterRefs = {}
  // Holds the collapse/expand arrow direction for tabs
  const [tabDirection, setTabDirection] = createSignal<{ [key: string]: TabProps["direction"] }>({ whiteboard: "left", code: "up", console: "up" })

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

  // events
  setupSocket()

  onMount((() => {
    computeTabDirection()
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

  const toggleTabFullScreen = (tabType: TabType) => {
    if (isNullOrUndefined(tabInFullScreen())) {
      setTabInFullScreen(tabType)
      enableFullScreen()
    }
    else {
      setTabInFullScreen(null)
      disableFullScreen()
    }
  }

  const enableFullScreen = () => {
    const tabType = tabInFullScreen()

    const _markAllEmpty = (node: SplitNode) => {
      if (node.type === "element") return

      const nodeProps = splitNodesProps()[node.splitterId]

      nodeProps.sizes = node.children.map((_) => 0)
      for (let childNode of node.children) {
        _markAllEmpty(childNode)
      }
    }

    const _recursive = (node: SplitNode) => {
      if (node.type === "element") {
        return node.elementId === tabType
      }

      const nodeProps = splitNodesProps()[node.splitterId]

      // Update sizes for this node and all its children
      let foundIndex = -1
      for (let [index, childNode] of node.children.entries()) {
        if (foundIndex >= 0) {
          _markAllEmpty(childNode)
        }
        else {
          foundIndex = _recursive(childNode) ? index : foundIndex
        }
      }

      if (foundIndex >= 0) {
        nodeProps.sizes = nodeProps.sizes.map((_, index) => index === foundIndex ? 100 : 0)
        return true
      }

      return false
    }

    _recursive(splitNodes())
    setSplitNodeProps({ ...splitNodesProps() })
    for (let splitterId of Object.keys(splitterRefs)) {
      splitterRefs[splitterId].recreate()
    }
  }

  const disableFullScreen = () => {
    const _restore = (node: SplitNode) => {
      if (node.type === "element") return

      const nodeProps = splitNodesProps()[node.splitterId]

      nodeProps.sizes = nodeProps.storedSizes  // restore sizes

      for (let childNode of node.children) {
        _restore(childNode)
      }
    }

    _restore(splitNodes())
    setSplitNodeProps({ ...splitNodesProps() })
    for (let splitterId of Object.keys(splitterRefs)) {
      splitterRefs[splitterId].recreate()
    }
    computeTabDirection()
  }

  const toggleTabExpandCollapse = (tabType: TabType) => {
    // TODO: Implement this
  }


  const onSplitterDragEnd = (splitterId: string, e: number[]) => {
    console.log(splitterId, e)
    splitNodesProps()[splitterId].sizes = e
    splitNodesProps()[splitterId].storedSizes = e
    setSplitNodeProps({ ...splitNodesProps() })
    computeTabDirection()
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
          <div class='h-full flex flex-col app-bg'>
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
                      <CheckboxControl class="!ml-0"/>
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