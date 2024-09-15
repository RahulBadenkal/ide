import { For, JSX, mergeProps, Show } from "solid-js";

import { Separator } from "@/components/ui/separator";

export type Tab = {
  id: string;
  icon: JSX.Element
  title: string;
}

export type TabProps = {
  tabs: Tab[],
  activeTabId: string;
  content: JSX.Element,
}

export const Tab = (props: TabProps) => {
  return <div class="w-full h-full flex flex-col" style="border: 1px solid gray; border-radius: 8px;">
    <div class="flex bg-gray-200 p-1 shrink-0" style="border-top-left-radius: 8px; border-top-right-radius: 8px;">
      <For each={props.tabs}>
        {(tab, index) =>
        <div class={"flex items-center cursor-pointer hover:bg-gray-300 " + (props.activeTabId === tab.id ? 'opacity-100 ': 'opacity-60')} style="border-radius: 5px;">
          <Show when={index() > 0}>
            <div class="h-full py-[6px]">
              <Separator orientation="vertical" class="bg-black"/>
            </div>
          </Show>
          <div class="flex items-center gap-1 px-2 py-1 text-sm">
            {tab.icon}
            <div>{tab.title}</div>
          </div>
          
        </div>
        }
      </For>
    </div>
    <div class="grow overflow-auto" style="border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
      {props.content}
    </div>
  </div>

}