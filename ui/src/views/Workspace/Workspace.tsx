import { Button } from "@frontend/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@frontend/components/ui/dropdown-menu";
import type {
  DropdownMenuSubTriggerProps,
} from "@kobalte/core/dropdown-menu";
import { createEffect, createSignal } from "solid-js";
import ChevronDownIcon from 'lucide-solid/icons/chevron-down';
import CheckIcon from 'lucide-solid/icons/check';
import Share2Icon from 'lucide-solid/icons/share-2';
import LinkIcon from 'lucide-solid/icons/link';
import GlobeIcon from 'lucide-solid/icons/globe';
import SettingsIcon from 'lucide-solid/icons/settings';
import LayoutDashboardIcon from 'lucide-solid/icons/layout-dashboard';
import SunIcon from 'lucide-solid/icons/sun';
import MoonIcon from 'lucide-solid/icons/moon';
import CodeXmlIcon from 'lucide-solid/icons/code-xml';
import CircleEllipsesIcon from 'lucide-solid/icons/circle-ellipsis';
import KeyboardIcon from 'lucide-solid/icons/keyboard';
import PencilOffIcon from 'lucide-solid/icons/pencil-off'
import CircleUserRound from 'lucide-solid/icons/circle-user-round'
import RunIcon from '@frontend/assets/run/run.svg'
import DebugIcon from '@frontend/assets/debug/debug.svg'
import ReRunIcon from '@frontend/assets/rerun/rerun.svg'
import StopIcon from '@frontend/assets/stop/stop.svg'

import {
  Combobox,
  ComboboxItem,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxInput
} from "@frontend/components/ui/combobox";
import { createFilter } from "@kobalte/core";
import { For } from "solid-js"
import { Show } from "solid-js"
import { Switch, SwitchControl, SwitchThumb, SwitchLabel } from "@frontend/components/ui/switch";
import { TextField, TextFieldLabel, TextFieldRoot } from "@frontend/components/ui/textfield";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@frontend/components/ui/dialog";
import { Switch as SolidSwitch, Match } from "solid-js"
import { Separator } from "@frontend/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@frontend/components/ui/tooltip";
import PresentationIcon from 'lucide-solid/icons/presentation';
import CirclePlayIcon from 'lucide-solid/icons/circle-play';
import * as Y from 'yjs'


import './Workspace.styles.scss'
import { Tabs, TabsList, TabsTrigger } from "@frontend/components/ui/tabs";
import { Tab, TabProps } from "./Tab";
import { CodeEditor } from "@frontend/components/CodeEditor/CodeEditor";
import Split from 'split-grid'
import { SplitGrid } from "@frontend/components/SplitGrid/SplitGrid";
import { Whiteboard } from "@frontend/components/Whiteboard/Whiteboard";

// types
type Language = { id: string, display: string, icon: string }
type Collaborator = { id: string, name: string }

// Constants
const LANGUAGES: Language[] = [
  { id: 'python3.12', display: 'Python (v3.12)', icon: '' },
  { id: 'js', display: 'JavaScript (Node v20)', icon: '' }
]

export const Workspace = () => {
  // Helpers
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
          <Switch class="flex items-center space-x-2">
            <SwitchControl>
              <SwitchThumb />
            </SwitchControl>
            <SwitchLabel class="text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70">
              Show only mine
            </SwitchLabel>
          </Switch>
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
                <Show when={currentDoc().id === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
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

  const onDocumentChange = (docId: string) => {

  }

  const _languageDropdownJsx = () => {
    return <DropdownMenu placement="bottom-start">
      <DropdownMenuTrigger
        as={(props: DropdownMenuSubTriggerProps) => (
          <Button variant="outline" {...props}>
            <div class="flex items-center gap-x-1">
              <div>{language().display}</div>
              <ChevronDownIcon size={16} />
            </div>
          </Button>
        )}
      />
      <DropdownMenuContent class="w-56">
        <For each={LANGUAGES}>
          {(item, index) =>
            <DropdownMenuItem class="cursor-pointer" onClick={e => onLanguageChange(item)}>
              <Show when={language().id === item.id} fallback={<div class="w-[16px] mr-2"></div>}>
                <CheckIcon size={16} class="mr-2"></CheckIcon>
              </Show>
              <span>{item.display}</span>
            </DropdownMenuItem>
          }
        </For>
      </DropdownMenuContent>
    </DropdownMenu>
  }

  const _shareJsx = () => {
    return <DropdownMenu placement="bottom-start">
      <DropdownMenuTrigger
        as={(props: DropdownMenuSubTriggerProps) => (
          <Button variant="outline" {...props} class={sharing() ? 'bg-primary/10 hover:bg-primary/5' : ''}>
            <div class="relative inline-block">
              <div class="flex items-center gap-x-2">
                <Share2Icon size="16" />
                <div>Share</div>
              </div>
              <Show when={sharing()}>
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
              <Switch checked={sharing()} onChange={(e) => setSharing(!sharing())}>
                <SwitchControl >
                  <SwitchThumb />
                </SwitchControl>
              </Switch>
            </div>
          </div>

          <Show when={sharing()}>
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
              <Switch class="mt-1" checked={readOnly()} onChange={(e) => setReadOnly(!readOnly())}>
                <SwitchControl >
                  <SwitchThumb />
                </SwitchControl>
              </Switch>
            </div>

            <div class="flex items-center gap-x-2">
              <div class="font-medium text-sm">Sync run/debug sessions</div>
              <Switch class="mt-1" checked={syncRunSession()} onChange={(e) => setSyncRunSession(!syncRunSession())}>
                <SwitchControl >
                  <SwitchThumb />
                </SwitchControl>
              </Switch>
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

  // Variables
  const [language, setLanguage] = createSignal<Language>(LANGUAGES.find((x) => x.id === 'python3.12'))
  const [sharing, setSharing] = createSignal(false)
  const [collaborators, setCollaborators] = createSignal<Collaborator[]>([{ id: '1', name: 'User1' }, { id: '2', name: 'User2' }])
  const [currentUser, setCurrentUser] = createSignal<Collaborator>(collaborators()[0])
  const [readOnly, setReadOnly] = createSignal(false)
  const [syncRunSession, setSyncRunSession] = createSignal(false)
  const [docName, setDocName] = createSignal('My Doc Name')
  const allDocuments = [
    { id: "1", name: 'name1', owner: 'ownner1', readOnly: true },
    { id: "2", name: 'name2', owner: 'ownner2', readOnly: false },
    { id: "3", name: 'name3', owner: 'ownner3', readOnly: false },
    { id: "4", name: 'name4', owner: 'ownner4', readOnly: true },
    { id: "5", name: 'name5', owner: 'ownner5', readOnly: false }
  ]
  const [currentDoc, setCurrentDoc] = createSignal(allDocuments[0])
  const [documents, setDocuments] = createSignal(allDocuments)

  // events
  const onLanguageChange = (newLanguage: Language) => {
    if (newLanguage.id === language().id) {
      return
    }
    setLanguage(newLanguage)
  }

  const ydoc = new Y.Doc()
  const appDoc = ydoc.getMap('app')
  const yCode = new Y.Text()
  const yWhiteboard = new Y.Array()
  appDoc.set('code', yCode)
  appDoc.set('whiteboard', yWhiteboard)

  createEffect(() => {
    Split({
      columnGutters: [{
          track: 1,
          element: document.querySelector('.gutter-col-1'),
      }],
    })
  })

  // HTML
  return (
    <div class='h-full flex flex-col app-bg'>
      {/* Toolbar */}
      <div class='shrink-0 flex justify-between items-center px-5 py-2'>
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

      {/* Body */}
      <div class='grow px-[10px] pb-[10px] overflow-auto flex flex-col gap-2'>
        <div class="flex h-[60%] gap-2">
          <Tab tabs={[{id: 'code', icon: <CodeXmlIcon size={16} />, title: 'Code'}]} activeTabId="code" content={CodeEditor({yCode})} />
          <Tab tabs={[{id: 'whiteboard', icon: <CodeXmlIcon size={16} />, title: 'Whiteboard'}]} activeTabId="whiteboard" content={Whiteboard({yWhiteboard: yWhiteboard as any})} />
        </div>
        <div class="h-[40%]">
          <Tab tabs={[{id: 'console', icon: <CirclePlayIcon size={16} />, title: 'Console'}]} activeTabId="console" content={
            <div class="h-full">
              Console
            </div>
          } />
        </div>      
      </div>
    </div>
  )
}
