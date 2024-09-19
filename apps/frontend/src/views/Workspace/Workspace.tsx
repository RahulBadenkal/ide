import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"
import { BACKEND_SOCKET_BASE_URL } from "@/helpers/constants";
import { useNavigate, useParams } from "@solidjs/router";
import { formUrl, isNullOrUndefined } from "@ide/ts-utils/src/lib/utils";
import { getCookie } from "@ide/browser-utils/src/lib/utils";
import './Workspace.styles.scss'
import { Awareness, Collaborator, Doc, Language, Role } from "@ide/shared/src/lib/types"
import * as Y from "yjs"
import { fromBase64ToUint8Array, fromUint8ArrayToBase64 } from "@ide/shared/src/lib/helpers"

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
import Loader2Icon from 'lucide-solid/icons/loader-2';

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

// types
type LanguageMetada = {id: Language, display: string, icon: string}

// Constants
const LANGUAGE_METADATA: Map<Language, LanguageMetada> = new Map([
  [Language.PYTHON_3_12, {id: Language.PYTHON_3_12, display: 'Python (v3.12)', icon: ''}],
  [Language.JS_NODE_20, {id: Language.JS_NODE_20, display: 'JavaScript (Node v20)', icon: ''}]
])
const LANGUAGES: LanguageMetada[] = [
  Language.PYTHON_3_12,
  Language.JS_NODE_20
].map((x) => LANGUAGE_METADATA.get(x))

// Component
export const Workspace = () => {
  // helpers
  const sendMessage = (message: any) => {
    if (socket && socket.readyState === socket.OPEN) {
      // console.log('send message to server', message)
      // console.log("\n")
      socket.send(JSON.stringify(message))
    }
  }

  const handleIncomingMessage = (message: any) => {
    // console.log('incoming, message', message)
    const {type, data, docDelta, awarenessDelta} = message
    
    if (docDelta) {
      Y.applyUpdate(yDoc, fromBase64ToUint8Array(docDelta))
    }
    if (awarenessDelta) {
      Y.applyUpdate(yAwareness, fromBase64ToUint8Array(awarenessDelta))
    }

    switch (type) {
      case "init": {
        setUser(data.user)
        setRole(data.role)
        // TODO: Should just replace the local doc with remote doc? But would need to reinitialize the listeners
        Y.applyUpdate(yDoc, fromBase64ToUint8Array(data.doc))
        Y.applyUpdate(yAwareness, fromBase64ToUint8Array(data.awareness))
        setPageUrl()
        setPageLoadApiInfo({state: ApiState.LOADED})
        console.log(doc())
        break
      }
      case "toggleSharing": {
        setPageUrl()
        break
      }
      case "error": {
        setPageLoadApiInfo({state: ApiState.ERROR, error: data})
        console.error(data)
        break
      }
    }
  }

  const setPageUrl = () => {
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

  const toolbarJsx = () => {
    const _languageDropdownJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <Button variant="outline" {...props}>
              <div class="flex items-center gap-x-1">
                <div>{LANGUAGE_METADATA.get(doc().activeLanguage).display}</div>
                <ChevronDownIcon size={16} />
              </div>
            </Button>
          )}
        />
        <DropdownMenuContent class="w-56">
          <For each={LANGUAGES}>
            {(item, index) =>
              <DropdownMenuItem class="cursor-pointer" onClick={e => onLanguageChange(item.id)}>
                <Show when={doc().activeLanguage === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
                  <CheckIcon size={16} class="mr-2"></CheckIcon>
                </Show>
                <span>{item.display}</span>
              </DropdownMenuItem>
            }
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    }

    // const _allWorkspacesJsx = () => {
    //   return <DropdownMenu placement="bottom-start">
    //     <DropdownMenuTrigger
    //       as={(props: DropdownMenuSubTriggerProps) => (
    //         <Button class="p-0 shrink-0" variant="link" {...props}>Workspaces</Button>
    //       )}
    //     />
    //     <DropdownMenuContent class="p-3 grid gap-y-3 w-[400px]">
    //       <div class="flex items-center justify-between">
    //         <div class="font-medium">All Workspaces</div>
    //         <div>
    //         <SwitchUI class="flex items-center space-x-2">
    //           <SwitchControl>
    //             <SwitchThumb />
    //           </SwitchControl>
    //           <SwitchLabel class="text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70">
    //             Show only mine
    //           </SwitchLabel>
    //         </SwitchUI>
    //           </div>
    //       </div>
    //       <div>
    //         <TextFieldRoot class="w-full">
    //           <TextField type="text" placeholder="Search by name/owner" />
    //         </TextFieldRoot>
    //       </div>
    //       <div>
    //         <For each={documents()}>
    //           {(item, index) =>
    //             <DropdownMenuItem closeOnSelect={false} class="cursor-pointer" onClick={e => onDocumentChange(item.id)}>
    //               <Show when={document().id === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
    //                 <CheckIcon size={16} class="mr-2"></CheckIcon>
    //               </Show>
    //               <div class="w-full flex items-center justify-between">
    //                 <div>
    //                   <div>{item.name}</div>
    //                   <div class="text-xs">{item.owner}</div>
    //                 </div>
    //                 <div>
    //                   <Show when={item.readOnly}>
    //                     <Tooltip>
    //                       <TooltipTrigger>
    //                         <PencilOffIcon size={16} />
    //                       </TooltipTrigger>
    //                       <TooltipContent>
    //                         <p>No write access</p>
    //                       </TooltipContent>
    //                     </Tooltip>
    //                   </Show>
    //                 </div>
    //               </div>
  
    //             </DropdownMenuItem>
    //           }
    //         </For>
    //       </div>
  
    //     </DropdownMenuContent>
    //   </DropdownMenu>
    // }

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
            <Show when={isOwner()}>
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
                  <TextFieldLabel>Your name</TextFieldLabel>
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
              <Show when={isOwner()}>
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
    return  <DropdownMenu placement="bottom-start">
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
          <TextFieldLabel>Your name</TextFieldLabel>
          <TextField type="text" placeholder="Amazing you" value={user().name} onInput={(e) => onUserNameChange((e.target as any).value)}/>
        </TextFieldRoot>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
  }

    return <div class='shrink-0 flex justify-between items-center px-5 py-2'>
      {/* Logo */}
      <div class="flex items-center gap-x-3">
        <div class="h-5 flex items-center">
          <img src='https://leetcode.com/_next/static/images/logo-ff2b712834cf26bf50a5de58ee27bcef.png' class='h-full mr-2'></img>
          <Separator orientation="vertical" />
        </div>
        <div class="w-full max-w-[250px]">
          <TextFieldRoot class="w-full">
            <TextField type="text" placeholder="Type your doc name..." class="bg-background" value={doc().name} onInput={(e) => onDocNameUpdate(e.currentTarget.value)} />
          </TextFieldRoot>
        </div>
        {/* {_allWorkspacesJsx()} */}
      </div>

      {/* Language selection */}
      <div class="min-w-[250px]">
        {_languageDropdownJsx()}
      </div>

      {/* Run icons */}
      {/* <div class="flex gap-4"> */}
        {/* @ts-ignore */}
        {/* <RunIcon width="18" class="cursor-pointer" /> */}
        {/* @ts-ignore */}
        {/* <ReRunIcon width="18" class="cursor-pointer" /> */}
        {/* @ts-ignore */}
        {/* <StopIcon width="18" class="cursor-pointer" /> */}
      {/* </div> */}

      {/* Share & Settin`gs */}
      <div class="flex gap-x-4">
        {_shareJsx()}
        {/* {_layoutsJsx()} */}
        {/* {_settingsJsx()} */}
        {_accountJsx()}
      </div>
    </div>
  }
  

  // variables
  const params = useParams()
  const navigate = useNavigate();
  const socket = new WebSocket(formUrl({basePath: BACKEND_SOCKET_BASE_URL, otherPath: "api/workspace/room", params: {documentId: params.documentId, roomId: params.roomId, 'x-user-id': getCookie('x-user-id')}}))
  const [pageLoadApiInfo, setPageLoadApiInfo] = createSignal<ApiLoadInfo>({state: ApiState.LOADING})
  const [socketStatus, setSocketStatus] = createSignal<"open" | "close">("close")
  const [user, setUser] = createSignal<any>()
  const [role, setRole] = createSignal<Role>()
  
  let yDoc: Y.Doc = new Y.Doc();
  let yAwareness: Y.Doc = new Y.Doc()
  const [doc, setDoc] = createSignal<Doc>()
  const [awareness, setAwareness] = createSignal<Awareness>()
  window['doc'] = yDoc
  window['awareness'] = yAwareness

  const [isRoomLinkCopied, setIsRoomLinkCopied] = createSignal(false)
  const [isNewRoomLinkGenerated, setIsNewLinkGenerated] = createSignal(false)

  const [collaborators, setCollaborators] = createSignal<any>();
  const [document, setDocument] = createSignal<any>()
  const [roomId, setRoomId] = createSignal<any>();
  const [readOnly, setReadOnly] = createSignal<any>();
  const [syncRunSession, setSyncRunSession] = createSignal<any>();

  // computed variables
  const pageLoaded = createMemo(() => pageLoadApiInfo().state === ApiState.LOADED)
  const isOwner = createMemo(() => pageLoaded() ? doc().owner === user().id: false)
  const totalCollaborators = createMemo(() => pageLoaded() ? Object.keys(awareness().collaborators).length : 0)
  const roomLink = createMemo(() => pageLoaded() ? `${window.location.origin}/rooms/${doc().roomId}` : "")



  // events
  // socket events
  socket.onopen = (event) => {
    console.log('Connected to WebSocket server', event);
    setSocketStatus("open")
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    handleIncomingMessage(message)
  }

  socket.onclose = (event) => {
    console.log('Disconnected from WebSocket server', event);
    setSocketStatus("close")
  }

  socket.onerror = (event) => {
    console.error('WebSocket error', event);
  }

  // yjs events
  yDoc.on("update", (update, _, __, tr) => {
    console.log('update', tr.local, tr.origin)
    const {type = null, ...data} = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}
    if (tr.local) {
      // change made by current user, send to peers
      const base64Update = fromUint8ArrayToBase64(update)
      const message = {type, data, docDelta: base64Update}
      sendMessage(message)
    }
    // update local doc
    setDoc(yDoc.getMap().toJSON() as any)
  })

  yAwareness.on("update", (update, _, __, tr) => {
    const {type = null, ...data} = !isNullOrUndefined(tr.origin) && typeof tr.origin === "object" ? tr.origin : {}
    if (tr.local) {
      // change made by current user, send to peers
      const base64Update = fromUint8ArrayToBase64(update)
      const message = {type, data, awarenessDelta: base64Update}
      sendMessage(message)
    }
    setAwareness(yAwareness.getMap().toJSON() as any)
  })


  // toolbar events
  const onDocNameUpdate = (name: string) => {
    yDoc.transact(() => {
      yDoc.getMap().set('name', name)
    }, {type: 'updateDocName'})
  }

  const onLanguageChange = (language: Language) => {
    yDoc.transact(() => {
      yDoc.getMap().set("activeLanguage", language) 
    }, {type: 'updateLanguage'})
  }

  const toggleSharing = () => {
    yDoc.transact(() => {
      let sharing = !doc().sharing
      yDoc.getMap().set("sharing", sharing)
      if (sharing && !doc().roomId) {
        yDoc.getMap().set("roomId", crypto.randomUUID())
      }
    }, {type: 'toggleSharing'})
    setPageUrl()
  }

  const onUserNameChange = (name: string) => {
    setUser({...user(), name: name});
    yAwareness.transact(() => {
      (yAwareness.getMap().get("collaborators") as Y.Map<any>).get(user().id).set("name", name)
    }, {type: 'updateUserName'})
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
    yDoc.transact(() => {
      yDoc.getMap().set("roomId", crypto.randomUUID())
    }, {type: 'changeRoomLink'})
    setIsNewLinkGenerated(true)
    setTimeout(() => setIsNewLinkGenerated(false), 2000)
    setPageUrl()
  }


  // init
  // show loader, establish websocket connection, handle error

  // HTML
  return (
    <Switch>
      <Match when={pageLoadApiInfo().state === ApiState.LOADING}>
        <PageLoader />
      </Match>
      <Match when={pageLoadApiInfo().state === ApiState.ERROR}>
        <div class="text-red-600">{pageLoadApiInfo().error?.message}</div>
      </Match>
      <Match when={pageLoadApiInfo().state === ApiState.LOADED}>
        <div class='h-full flex flex-col app-bg'>
          {toolbarJsx()}
        </div>
      </Match>
    </Switch>
  )
}
