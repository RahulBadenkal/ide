import { children, JSX, createEffect } from "solid-js";
import "./SplitPane.scss"
import Split from "split.js";

export type SplitPaneProps = {
  children: JSX.Element;
  direction: Split.Options["direction"]
  minSize: Split.Options["minSize"];
  gutterSize: number;
  sizes: number[];
}

export const SplitPane = (props: SplitPaneProps) => {
  const content = children(() => props.children);
  let split: Split.Instance

  const recreate = () => {
    // console.log("Recreating...", crypto.randomUUID().slice(0, 6))
    if (split) {
      split.destroy()
    }
    
    split = Split(content() as any, {
      direction: props.direction,
      minSize: props.minSize,
      sizes: props.sizes,
      gutterSize: props.gutterSize,

      snapOffset: 0,
      dragInterval: 1,
    })
  }


  createEffect(() => {
    recreate()
  })

  // console.log('Heyo', crypto.randomUUID().slice(0, 6))
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