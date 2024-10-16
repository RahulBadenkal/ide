import { createSignal, onMount, createEffect, type Component, onCleanup } from "solid-js";
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Excalidraw  } from "@excalidraw/excalidraw";
import * as Y from 'yjs'

import './Whiteboard.styles.scss';
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { ExcalidrawBinding, yjsToExcalidraw } from "y-excalidraw"
import type * as awarenessProtocol from "y-protocols/awareness.js";

export type WhiteboardProps = {
  yElements: Y.Array<Y.Map<any>>,  // {el: ExcalidrawElement, pos: string}
  yAssets: Y.Map<any>
  yAwareness: awarenessProtocol.Awareness,
};

export const Whiteboard: Component<WhiteboardProps> = (props) => {
  const [containerRef, setContainerRef] = createSignal<HTMLElement | undefined>();
  const [excalidrawRef, setExcalidrawRef] = createSignal<any>();
  const [excalidrawAPI, setExcalidrawAPI] = createSignal<ExcalidrawImperativeAPI | undefined>();

  let root: ReturnType<typeof createRoot>;
  let observer: MutationObserver
  let undoManager: Y.UndoManager;
  let binding: ExcalidrawBinding

  onMount(() => {});

  createEffect(() => {
    if (containerRef()) {
      // Draw excalidraw on dom
      root = createRoot(containerRef());
      renderExcalidraw();

      // Observe when excalidraw is added to dom
      if (observer) {
        observer.disconnect()
      }
      observer = new MutationObserver(function(mutations, observer) {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE && (node as any).classList.contains('excalidraw-container')) {
                setExcalidrawRef(node as any)
                observer.disconnect()
              }
            });
          }
        }
      })
      observer.observe(containerRef(), {childList: true});
    }
  })

  createEffect(() => {
    if (excalidrawAPI() && excalidrawRef()) {
      if (undoManager) {
        undoManager.destroy()
      }
      if (binding) {
        binding.destroy()
      }
      
      // Edits from peers(server) comes with origin as null and by default undoManager tracks null origin, 
      // so removing that so that it doesn't consider that in the user's local undo-redo cache
      undoManager = new Y.UndoManager(props.yElements, {trackedOrigins: new Set()})   
 
      binding = new ExcalidrawBinding(
        props.yElements,
        props.yAssets,
        excalidrawAPI(),
        props.yAwareness,
        {excalidrawDom: containerRef(), undoManager: undoManager},
      );
    } 
  })

  const renderExcalidraw = () => {
    root.render(
      React.createElement(Excalidraw, {
        initialData: {
          elements: yjsToExcalidraw(props.yElements),
          appState: { viewBackgroundColor: '#FFFFFF' },
        },
        excalidrawAPI: (api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api),
        onPointerUpdate: (payload) => binding && binding.onPointerUpdate(payload),
      })
    )
  };

  onCleanup(() => {
    if (observer) {
      observer.disconnect()
    }
    if (binding) {
      binding.destroy()
    }
  })

  return (
    <div ref={setContainerRef} class="whiteboard"></div>
  );
};