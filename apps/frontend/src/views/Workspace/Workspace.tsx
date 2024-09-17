import { createSignal, For, Match, Show, Switch } from "solid-js"
import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"
import { BACKEND_SOCKET_BASE_URL } from "@/helpers/constants";
import { useParams } from "@solidjs/router";
import { formUrl } from "@ide/ts-utils/src/lib/utils";
import { getCookie } from "@ide/browser-utils/src/lib/utils";
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

// Constants
const LANGUAGES: any[] = [
  { id: 'python3.12', display: 'Python (v3.12)', icon: '' },
  { id: 'js', display: 'JavaScript (Node v20)', icon: '' }
]

// Component
export const Workspace = () => {
  // helpers
  const handleIncomingMessage = (message: any) => {
    console.log('incoming, message', message)
    const {type, data} = message

    switch (type) {
      case "init": {
        setPageLoadApiInfo({state: ApiState.LOADED})
        setUser(data.user)
        setDocuments(data.documents)
        setDocument(data.document)
        break
      }
      case "error": {
        console.error(data)
      }
    }
  }

  const toolbarJsx = () => {
    const _languageDropdownJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <Button variant="outline" {...props}>
              <div class="flex items-center gap-x-1">
                <div>{activeLanguage().display}</div>
                <ChevronDownIcon size={16} />
              </div>
            </Button>
          )}
        />
        <DropdownMenuContent class="w-56">
          <For each={LANGUAGES}>
            {(item, index) =>
              <DropdownMenuItem class="cursor-pointer" onClick={e => onLanguageChange(item)}>
                <Show when={activeLanguage().id === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
                  <CheckIcon size={16} class="mr-2"></CheckIcon>
                </Show>
                <span>{item.display}</span>
              </DropdownMenuItem>
            }
          </For>
        </DropdownMenuContent>
      </DropdownMenu>
    }

    const _allWorkspacesJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <Button class="p-0 shrink-0" variant="link" {...props}>Workspaces</Button>
          )}
        />
        <DropdownMenuContent class="p-3 grid gap-y-3 w-[400px]">
          <div class="flex items-center justify-between">
            <div class="font-medium">All Workspaces</div>
            <div>
            <SwitchUI class="flex items-center space-x-2">
              <SwitchControl>
                <SwitchThumb />
              </SwitchControl>
              <SwitchLabel class="text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70">
                Show only mine
              </SwitchLabel>
            </SwitchUI>
              </div>
          </div>
          <div>
            <TextFieldRoot class="w-full">
              <TextField type="text" placeholder="Search by name/owner" />
            </TextFieldRoot>
          </div>
          <div>
            <For each={documents()}>
              {(item, index) =>
                <DropdownMenuItem closeOnSelect={false} class="cursor-pointer" onClick={e => onDocumentChange(item.id)}>
                  <Show when={document().id === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
                    <CheckIcon size={16} class="mr-2"></CheckIcon>
                  </Show>
                  <div class="w-full flex items-center justify-between">
                    <div>
                      <div>{item.name}</div>
                      <div class="text-xs">{item.owner}</div>
                    </div>
                    <div>
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
                    </div>
                  </div>
  
                </DropdownMenuItem>
              }
            </For>
          </div>
  
        </DropdownMenuContent>
      </DropdownMenu>
    }

    const _shareJsx = () => {
      return <DropdownMenu placement="bottom-start">
        <DropdownMenuTrigger
          as={(props: DropdownMenuSubTriggerProps) => (
            <Button variant="outline" {...props} class={isSharing() ? 'bg-primary/10 hover:bg-primary/5' : ''}>
              <div class="relative inline-block">
                <div class="flex items-center gap-x-2">
                  <Share2Icon size="16" />
                  <div>Share</div>
                </div>
                <Show when={isSharing()}>
                  <div class="absolute -bottom-3 -right-5 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold border-2 bg-primary text-primary-foreground">
                    {collaborators().length}
                  </div>
                </Show>
  
              </div>
            </Button>
          )}
        />
        <DropdownMenuContent class="p-3 grid gap-y-3 w-[400px]">
          <div class="font-medium">Multiplayers</div>
          <div class="grid gap-y-3">
            <div class="flex justify-between">
              <div class="flex items-center gap-x-3">
                <div><GlobeIcon size={24} /></div>
                <div>
                  <div class="font-medium">Private join link</div>
                  <div class="text-xs">Allow others access to this workspace</div>
                </div>
              </div>
              <div>
                <SwitchUI checked={isSharing()} onChange={(e) => toggleSharing()}>
                  <SwitchControl >
                    <SwitchThumb />
                  </SwitchControl>
                </SwitchUI>
              </div>
            </div>
  
            <Show when={isSharing()}>
              <div>Hello</div>
              <div class="bg-primary/20 h-[1px] -ml-3 -mr-3"></div>
              <div>
                <TextFieldRoot class="w-full">
                  <TextFieldLabel>Your name</TextFieldLabel>
                  <TextField type="text" placeholder="Amazing you" />
                </TextFieldRoot>
              </div>
  
              <div class="flex items-center gap-x-2">
                <div class="font-medium text-sm">Allow others to edit</div>
                <SwitchUI class="mt-1" checked={readOnly()} onChange={(e) => toogleDocReadOnly()}>
                  <SwitchControl >
                    <SwitchThumb />
                  </SwitchControl>
                </SwitchUI>
              </div>
  
              <div class="flex items-center gap-x-2">
                <div class="font-medium text-sm">Sync run/debug sessions</div>
                <SwitchUI class="mt-1" checked={syncRunSession()} onChange={(e) => setSyncRunSession(!syncRunSession())}>
                  <SwitchControl >
                    <SwitchThumb />
                  </SwitchControl>
                </SwitchUI>
              </div>
  
              <div class="flex items-center text-sm">
                <div class="w-full p-2 rounded-tl-[6px] rounded-bl-[6px] bg-secondary">
                  https://www.google.com
                </div>
                <div class="shrink-0 flex items-center p-2 gap-x-2 bg-primary/20 rounded-tr-[6px] rounded-br-[6px]">
                  <LinkIcon size={16} />
                  <div>Copy join link</div>
                </div>
              </div>
              <div class="flex items-center gap-x-1">
                <div class="text-xs">Want to revoke access to this link?</div>
                <a class="text-xs font-medium" href="https://www.google.com">Generate a new link</a>
              </div>
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
          <TextField type="text" placeholder="Amazing you" />
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
            <TextField type="text" placeholder="Type your doc name..." class="bg-background" />
          </TextFieldRoot>
        </div>
        {_allWorkspacesJsx()}
      </div>

      {/* Language selection */}
      <div class="min-w-[250px]">
        {_languageDropdownJsx()}
      </div>

      {/* Run icons */}
      <div class="flex gap-4">
        {/* @ts-ignore */}
        <RunIcon width="18" class="cursor-pointer" />
        {/* @ts-ignore */}
        <ReRunIcon width="18" class="cursor-pointer" />
        {/* @ts-ignore */}
        <StopIcon width="18" class="cursor-pointer" />
      </div>

      {/* Share & Settin`gs */}
      <div class="flex gap-x-4">
        {_shareJsx()}
        {_layoutsJsx()}
        {_settingsJsx()}
        {_accountJsx()}
      </div>
    </div>
  }
  

  // variables
  const params = useParams()
  const socket = new WebSocket(formUrl({basePath: BACKEND_SOCKET_BASE_URL, otherPath: "api/workspace/room", params: {documentId: params.documentId, roomId: params.roomId, 'x-user-id': getCookie('x-user-id')}}))
  const [pageLoadApiInfo, setPageLoadApiInfo] = createSignal<ApiLoadInfo>({state: ApiState.LOADING})
  const [user, setUser] = createSignal<any>()
  const [documents, setDocuments] = createSignal<any>()
  const [collaborators, setCollaborators] = createSignal<any>();
  const [document, setDocument] = createSignal<any>()
  const [activeLanguage, setActiveLanguage] = createSignal<any>(LANGUAGES.find((x) => x.id === 'python3.12'));
  const [isSharing, setIsSharing] = createSignal<any>();
  const [roomId, setRoomId] = createSignal<any>();
  const [readOnly, setReadOnly] = createSignal<any>();
  const [syncRunSession, setSyncRunSession] = createSignal<any>();

  // computed variables

  // events
  // socket events
  socket.onopen = (event) => {
    console.log('Connected to WebSocket server', event);
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    handleIncomingMessage(message)
  }

  socket.onclose = (event) => {
    console.log('Disconnected from WebSocket server', event);
  }

  socket.onerror = (event) => {
    console.error('WebSocket error', event);
  }

  // toolbar events
  const onDocumentChange = (docId: string) => {

  }

  const onLanguageChange = (newLanguage: any) => {
   
  }

  const toggleSharing = () => {

  }

  const toogleDocReadOnly = () => {

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
        <div>Show page error</div>
        <div>{pageLoadApiInfo().error?.message}</div>
      </Match>
      <Match when={pageLoadApiInfo().state === ApiState.LOADED}>
        <div class='h-full flex flex-col app-bg'>
          {toolbarJsx()}
        </div>
      </Match>
    </Switch>
  )
}
