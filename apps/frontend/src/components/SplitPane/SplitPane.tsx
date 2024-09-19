import { createEffect, onCleanup, onMount, Component, JSX } from 'solid-js';
import Split from 'split.js';

type SplitWrapperProps = {
  sizes?: number[];
  minSize?: number | number[];
  maxSize?: number | number[];
  expandToMin?: boolean;
  gutterSize?: number;
  gutterAlign?: string;
  snapOffset?: number | number[];
  dragInterval?: number;
  direction?: string;
  cursor?: string;
  gutter?: (index: number, direction: string) => HTMLElement;
  elementStyle?: (dimension: number, size: number, gutterSize: number) => object;
  gutterStyle?: (dimension: number, gutterSize: number) => object;
  onDrag?: (sizes: number[]) => void;
  onDragStart?: (sizes: number[]) => void;
  onDragEnd?: (sizes: number[]) => void;
  collapsed?: number;
  children: JSX.Element[];
};

export const SplitPane: Component<SplitWrapperProps> = (props) => {
  let parentRef: HTMLDivElement | undefined;
  let split: Split.Instance;

  const initializeSplit = () => {
    if (!parentRef) return;

    const options: any = {
      ...props,
      gutter: (index, direction) => {
        let gutterElement: HTMLElement;

        if (props.gutter) {
          gutterElement = props.gutter(index, direction);
        } else {
          gutterElement = document.createElement('div');
          gutterElement.className = `gutter gutter-${direction}`;
        }

        (gutterElement as any).__isSplitGutter = true;
        return gutterElement;
      },
    };

    split = Split(Array.from(parentRef.children) as any, options);
  };

  onMount(() => {
    initializeSplit();
  });

  createEffect(() => {
    if (!split) return;

    const {
      sizes,
      minSize,
      maxSize,
      expandToMin,
      gutterSize,
      gutterAlign,
      snapOffset,
      dragInterval,
      direction,
      cursor,
    } = props;

    const needsRecreate = [
      maxSize,
      expandToMin,
      gutterSize,
      gutterAlign,
      snapOffset,
      dragInterval,
      direction,
      cursor,
    ].some((prop) => prop !== undefined);

    if (needsRecreate || (Array.isArray(minSize) && minSize.some((size, i) => size !== split.getSizes()[i]))) {
      split.destroy(true, true);
      initializeSplit();
    } else if (sizes) {
      split.setSizes(sizes);
    }

    if (typeof props.collapsed === 'number') {
      split.collapse(props.collapsed);
    }
  });

  onCleanup(() => {
    if (split) {
      split.destroy();
    }
  });

  return (
    <div ref={parentRef}>
      {props.children}
    </div>
  );
};