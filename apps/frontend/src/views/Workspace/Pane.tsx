import { createMemo, createSignal, For, JSX, Match, Show, Switch, onCleanup } from "solid-js";
import { createElementSize } from "@solid-primitives/resize-observer";
import "./Pane.scss"

// icons
import MaximizeIcon from 'lucide-solid/icons/maximize';
import MinimizeIcon from 'lucide-solid/icons/minimize';
import ChevronLeftIcon from 'lucide-solid/icons/chevron-left';
import ChevronRightIcon from 'lucide-solid/icons/chevron-right';
import ChevronUpIcon from 'lucide-solid/icons/chevron-up';
import ChevronDownIcon from 'lucide-solid/icons/chevron-down';
import { isNullOrUndefined } from "@ide/ts-utils/src/lib/utils";

export type Tab = {
  id: string;
  icon: JSX.Element
  title: string;
}

export type PaneProps = {
  class?: string;
  style?: string;
  children: JSX.Element,
  id: string;
  tabs: Tab[],
  activeTabId: string;
  direction?: "up" | "down" | "left" | "right"
  inFullScreenMode?: boolean;
  dropIndex?: number

  // events
  onTabChange: (tabId: string) => void
  toggleFullScreenMode: () => void
  toggleExpand: () => void
  onDragStart: (e: MouseEvent, tabId?: string) => void
}

export const Pane = (props: PaneProps) => {
  const [target, setTarget] = createSignal<HTMLElement>();
  const size = createElementSize(target);
  const minSize = 36;
  let started = false;
  let drag = false;

  const downListener = (e: MouseEvent) => {
    // console.log('downListener')
    started = true
    drag = false
  }

  const moveListener = (e: MouseEvent, tabId?: string) => {
    if (!started) {
      return
    }
    if (!drag) {
      // console.log('moveListener')
      props.onDragStart(e, tabId)
      drag = true
    }
  }

  const upListener = (e: MouseEvent) => {
    if (!started) {
      return
    }
    // console.log('upListener')
    started = false;
    drag = false
  }

  const orientation = createMemo(() => size.width <= minSize ? 'oriented': '')

  return <div ref={setTarget} data-pane-id={props.id} class={`${orientation()} relative group pane w-full h-full flex flex-col overflow-hidden [&.oriented]:flex-row ${props.class || ''}`} style={`border-radius: 8px; box-sizing: border-box; ${props.style || ''}`}>
    <div data-pane-id={props.id} data-pane-orientation={orientation()} onMouseDown={downListener} onMouseMove={moveListener} onMouseUp={upListener} onMouseLeave={upListener} class="tab-header-group cursor-pointer flex items-center justify-between bg-gray-100 p-1 flex-row group-[.oriented]:flex-col" style="border-top-left-radius: 8px; border-top-right-radius: 8px;">
      <div class="flex flex-row group-[.oriented]:flex-col">
        <For each={props.tabs}>
          {(tab, index) => <>
            <div
              data-pane-id={props.id}
              data-pane-orientation={orientation()}
              data-tab-header-index={index()}
              data-tab-header-id={tab.id}
              onMouseDown={(e) => {e.stopPropagation(); downListener(e)}}
              onMouseMove={(e) => {e.stopPropagation(); moveListener(e, tab.id)}}
              onMouseUp={(e) => {e.stopPropagation(); upListener(e)}}
              onMouseLeave={(e) => {e.stopPropagation(); upListener(e)}}
              class={"tab-header relative flex items-center cursor-pointer hover:bg-gray-200 " + (props.activeTabId === tab.id ? 'opacity-100 ' : 'opacity-60')} style="border-radius: 5px;"
              onClick={(e) => props.onTabChange(tab.id)}
            >
              <Show when={props.dropIndex === index()}>
                <div class={"absolute w-[1px] h-[16px] bg-blue-600"}></div>
              </Show>
              <Show when={index() > 0}>
                <div class={"w-[1px] h-[12px] bg-gray-200"}></div>
              </Show>
              <div class="flex items-center gap-1 text-sm flex-row px-2 py-1 group-[.oriented]:flex-col group-[.oriented]:px-1 group-[.oriented]:py-2">
                <div class="rotate-0 group-[.oriented]:rotate-90">{tab.icon}</div>
                <div class="[writing-mode:horizontal-tb] group-[.oriented]:[writing-mode:vertical-lr] ">{tab.title}</div>
              </div>
              <Show when={index() === (props.tabs.length - 1) && props.dropIndex === props.tabs.length}>
                <div class={"absolute right-0 w-[1px] h-[16px] bg-blue-600"}></div>
              </Show>
            </div>
          </>}
        </For>
      </div>
      <div class="grow h-full flex items-center justify-end flex-row group-[.oriented]:flex-col">
        <div class="flex items-center gap-x-1 hover-icons flex-row group-[.oriented]:flex-col">
          <div class="cursor-pointer flex items-center p-1 rounded hover:bg-gray-200" onMouseDown={(e) =>  e.stopPropagation()} onClick={props.toggleFullScreenMode}>
            <Show when={props.inFullScreenMode} fallback={<MaximizeIcon size={16} />}>
              <MinimizeIcon size={16} />
            </Show>
          </div>
          <div class="cursor-not-allowed flex items-center p-1 rounded hover:bg-gray-200" onMouseDown={(e) => e.stopPropagation()} onClick={props.toggleExpand}>
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

    </div>
    <div data-pane-id={props.id} class="pane-body grow overflow-auto" style="border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
      {props.children}
    </div>
  </div>
}