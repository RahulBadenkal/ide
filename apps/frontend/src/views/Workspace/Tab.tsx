import { createSignal, For, JSX, Match, Show, Switch } from "solid-js";
import { createElementSize } from "@solid-primitives/resize-observer";
import "./Tab.scss"

// icons
import MaximizeIcon from 'lucide-solid/icons/maximize';
import ChevronLeftIcon from 'lucide-solid/icons/chevron-left';
import ChevronRightIcon from 'lucide-solid/icons/chevron-right';
import ChevronUpIcon from 'lucide-solid/icons/chevron-up';
import ChevronDownIcon from 'lucide-solid/icons/chevron-down';

import { Separator } from "@/components/ui/separator";

export type Tab = {
  id: string;
  icon: JSX.Element
  title: string;
}

export type TabProps = {
  children: JSX.Element,
  tabs: Tab[],
  activeTabId: string;
  direction?: "up" | "down" | "left" | "right"
}

export const Tab = (props: TabProps) => {
  const [target, setTarget] = createSignal<HTMLElement>();
  const size = createElementSize(target);
  const minSize = 36;

  return <div ref={setTarget} class={(size.width <= minSize ? ' oriented ' : '') + "group tab-container w-full h-full flex flex-col overflow-hidden [&.oriented]:flex-row"} style="border: 1px solid gray; border-radius: 8px;">
    <div class="flex items-center justify-between bg-gray-200 p-1 flex-row group-[.oriented]:flex-col" style="border-top-left-radius: 8px; border-top-right-radius: 8px;">
      <div>
        <For each={props.tabs}>
          {(tab, index) =>
            <div class={"flex items-center cursor-pointer hover:bg-gray-300 " + (props.activeTabId === tab.id ? 'opacity-100 ' : 'opacity-60')} style="border-radius: 5px;">
              <Show when={index() > 0}>
                <div class="h-full py-[6px]">
                  <Separator orientation="vertical" class="bg-black" />
                </div>
              </Show>
              <div class="flex items-center gap-1 text-sm flex-row px-2 py-1 group-[.oriented]:flex-col group-[.oriented]:px-1 group-[.oriented]:py-2">
                <div class="rotate-0 group-[.oriented]:rotate-90">{tab.icon}</div>
                <div class="[writing-mode:horizontal-tb] group-[.oriented]:[writing-mode:vertical-lr] ">{tab.title}</div>
              </div>
            </div>}
        </For>
      </div>
      <div class="flex items-center gap-x-1 hover-icons flex-row group-[.oriented]:flex-col">
        <div class="cursor-pointer flex items-center p-1 rounded hover:bg-gray-300">
          <MaximizeIcon size={16} />
        </div>
        <div class="cursor-pointer flex items-center p-1 rounded hover:bg-gray-300">
          <Switch>
            <Match when={props.direction === "up"}>
              <ChevronUpIcon size={16} />
            </Match>
            <Match when={props.direction === "down"}>
              <ChevronDownIcon size={16} />
            </Match>
            <Match when={props.direction === "left"}>
              <ChevronLeftIcon size={16} />
            </Match>
            <Match when={props.direction === "right"}>
              <ChevronRightIcon size={16} />
            </Match>
          </Switch>
        </div>
      </div>
    </div>
    <div class="grow overflow-auto" style="border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
      {props.children}
    </div>
  </div>
}