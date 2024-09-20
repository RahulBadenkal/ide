import { Component, children, JSX, createEffect, createMemo, onMount, createSignal } from "solid-js";
import "./SplitPane.scss"
import Split from "split.js";

export type SplitPaneProps = {
  children: JSX.Element;
  ref?: any;
  direction: Split.Options["direction"]
  minSize: Split.Options["maxSize"];
  hide: boolean;
  sizes: number[];
}

export const SplitPane = (props: SplitPaneProps) => {
  const content = children(() => props.children);
  let split: Split.Instance

  const recreate = (hideOthers=false) => {
    console.log('recreate')
    if (split) {
      split.destroy()
    }
    setHideAll(false)

    split = Split(content() as any, {
      direction: props.direction,
      minSize: hideOthers ? 0 : (props.minSize || 0),
      snapOffset: 0,
      dragInterval: 1,

      gutterSize: hideOthers ? 0 : (props.minSize ? 10 : 0),
    })
  }


  createEffect(() => {
    // So that recreate triggers whenever content changes
    content()
    props.minSize

    recreate()
  })

  // public apis
  const expandPane = (index: number, hideOthers=false) => {
    recreate(hideOthers)
    for (let i=0; i<(content() as any) .length; i++) {
      if (i !== index) {
        split.collapse(i)
      }
    }
  }


  const collapsePane = (index: number) => {
    split.collapse(index)
  }
  const [hideAll, setHideAll] = createSignal(false)

  const hide = () => {
    setHideAll(true)
  }

  const show = () => {
    setHideAll(false)
  }

  onMount(() => {
    props.ref?.({ recreate, expandPane, collapsePane, hide, show });
  })


  return <div class={"split-container w-full h-full " + ('split-' + props.direction + " ") + (hideAll() ? ' hidden' : '')}>
    {content()}
  </div>
}

export type HorizontalSplitProps = Omit<SplitPaneProps, "direction">

export const HorizontalSplitPane = (props: HorizontalSplitProps) => {
  return <SplitPane direction="horizontal" {...props} />
}

export type VerticalSplitProps = Omit<SplitPaneProps, "direction">

export const VerticalSplitPane = (props: VerticalSplitProps) => {
  return <SplitPane direction="vertical" {...props} />
}