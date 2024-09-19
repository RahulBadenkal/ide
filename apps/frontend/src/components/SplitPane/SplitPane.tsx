import { Component, children, JSX, createEffect, createMemo, onMount } from "solid-js";
import "./SplitPane.scss"
import Split from "split.js";

export type SplitPaneProps = {
  children: JSX.Element;
  class?: string;
  direction: Split.Options["direction"]
  minSize?: Split.Options["maxSize"];
  snapOffset?: Split.Options["snapOffset"]
  dragInterval?: Split.Options["dragInterval"]
}

export const SplitPane = (props: SplitPaneProps) => {
  const content = children(() => props.children);
  let split: Split.Instance

  const recreate = () => {
    if (split) {
      split.destroy()
    }
    split = Split(content() as any, {
      direction: props.direction,
      minSize: props.minSize || 0,
      snapOffset: props.snapOffset || 0,
      dragInterval: props.dragInterval || 1,
    })
  }


  createEffect(() => {
    content()  // So that recreate triggers whenever content changes

    recreate()
  })

  return <div class={"split-container w-full h-full " + ('split-' + props.direction + " ")}>
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