import { createMemo, createSignal, For, JSX, Match, Show, Switch, onCleanup, createEffect } from "solid-js";
import { createElementSize } from "@solid-primitives/resize-observer";
import "./Pane.scss"

// icons
import MaximizeIcon from 'lucide-solid/icons/maximize';
import MinimizeIcon from 'lucide-solid/icons/minimize';
import ChevronLeftIcon from 'lucide-solid/icons/chevron-left';
import ChevronRightIcon from 'lucide-solid/icons/chevron-right';
import ChevronUpIcon from 'lucide-solid/icons/chevron-up';
import ChevronDownIcon from 'lucide-solid/icons/chevron-down';

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  dragDirection?: Split.Options["direction"];
  arrow?: "up" | "down" | "left" | "right"
  inFullScreenMode?: boolean;

  // events
  onTabChange: (tabId: string) => void
  toggleFullScreenMode: () => void
  toggleFold: () => void
  onDragStart: (e: MouseEvent, tabId?: string) => void
  collapseStatus: (props: {horizontal: boolean, vertical: boolean}) => void
}

export const Pane = (props: PaneProps) => {
  const [target, setTarget] = createSignal<HTMLElement>();
  const size = createElementSize(target);
  const minSize = 36;
  let started = false;
  let drag = false;
  let startX: number
  let startY: number
  const dragDelta = 6;
  const widthTolerance = 0.5

  const downListener = (e: MouseEvent) => {
    // console.log('downListener')
    started = true
    drag = false
    startX = e.pageX;
    startY = e.pageY;
  }

  const moveListener = (e: MouseEvent, tabId?: string) => {
    if (!started) {
      return
    }
    if (drag) {
      return
    }
    const diffX = Math.abs(e.pageX - startX);
    const diffY = Math.abs(e.pageY - startY);
    if (diffX < dragDelta && diffY < dragDelta) {
      // Its a click
      return
    }

    props.onDragStart(e, tabId)
    drag = true
  }

  const upListener = (e: MouseEvent) => {
    if (!started) {
      return
    }
    // console.log('upListener')
    started = false;
    drag = false
  }

  const orientation = createMemo(() => size.width <= minSize ? 'oriented' : '')

  const collapsed = createMemo(() => {
    if (!props.dragDirection) return false
    const isCollapsed = props.dragDirection === "horizontal" ? size.width <= (minSize + widthTolerance) : size.height <= (minSize + widthTolerance)
    return isCollapsed
  })

  createEffect(() => {
    props.collapseStatus({horizontal: size.width <= (minSize + widthTolerance), vertical: (size.height <= minSize + widthTolerance)})
  })

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
              onMouseDown={(e) => { e.stopPropagation(); downListener(e) }}
              onMouseMove={(e) => { e.stopPropagation(); moveListener(e, tab.id) }}
              onMouseUp={(e) => { e.stopPropagation(); upListener(e) }}
              onMouseLeave={(e) => { e.stopPropagation(); upListener(e) }}
              class={"tab-header relative flex items-center cursor-pointer hover:bg-gray-200 " + (props.activeTabId === tab.id ? 'opacity-100 ' : 'opacity-60')} style="border-radius: 5px;"
              onClick={(e) => props.onTabChange(tab.id)}
            >
              <Show when={index() > 0}>
                <div class={"w-[1px] h-[12px] bg-gray-200"}></div>
              </Show>
              <div class="flex items-center gap-1 text-sm flex-row px-2 py-1 group-[.oriented]:flex-col group-[.oriented]:px-1 group-[.oriented]:py-2">
                <div class="rotate-0 group-[.oriented]:rotate-90">{tab.icon}</div>
                <div class="[writing-mode:horizontal-tb] group-[.oriented]:[writing-mode:vertical-lr] ">{tab.title}</div>
              </div>
            </div>
          </>}
        </For>
      </div>
      <div class="grow h-full flex items-center justify-end flex-row group-[.oriented]:flex-col">
        <div class="flex items-center gap-x-1 hover-icons flex-row group-[.oriented]:flex-col">
          <div class="cursor-pointer flex items-center p-1 rounded hover:bg-gray-200" onMouseDown={(e) => e.stopPropagation()} onClick={props.toggleFullScreenMode}>
            <Show when={props.inFullScreenMode} fallback={<MaximizeIcon size={16} />}>
              <MinimizeIcon size={16} />
            </Show>
          </div>
          <Show when={props.arrow}>
            <Tooltip>
              <TooltipTrigger>
                <div class="cursor-pointer flex items-center p-1 rounded hover:bg-gray-200" onMouseDown={(e) => e.stopPropagation()} onClick={props.toggleFold}>
                  <Switch>
                    <Match when={props.arrow === "up"}>
                      <ChevronUpIcon size={16} />
                    </Match>
                    <Match when={props.arrow === "down"}>
                      <ChevronDownIcon size={16} />
                    </Match>
                    <Match when={props.arrow === "left"}>
                      <ChevronLeftIcon size={16} />
                    </Match>
                    <Match when={props.arrow === "right"}>
                      <ChevronRightIcon size={16} />
                    </Match>
                  </Switch>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{collapsed() ? 'Unfold' : 'Fold'}</p>
              </TooltipContent>
            </Tooltip>
          </Show>
        </div>
      </div>

    </div>
    <div data-pane-id={props.id} class="pane-body grow overflow-auto" style="border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
      {props.children}
    </div>
  </div>
}