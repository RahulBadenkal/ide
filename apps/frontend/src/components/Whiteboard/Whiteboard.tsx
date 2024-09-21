import { createSignal, onMount, createEffect, type Component } from "solid-js";
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Excalidraw  } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import * as Y from 'yjs'

import './Whiteboard.styles.scss';
import { applyOperations, getDeltaOperationsForYjs } from "./diff";
import { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { yjsToExcalidraw } from "./utils";

export type WhiteboardProps = {
  yWhiteboard: Y.Array<Y.Map<ExcalidrawElement | string>>,  // {el: ExcalidrawElement, pos: string}
  collaborators?: any, // SceneData["collaborators"],

  onCursorUpdate?: any
};


const getSceneVersion = (elements: readonly ExcalidrawElement[]) => {
  return elements.reduce((acc, x) => acc + x.version, 0)
}

// TODO: Add support when a new instance of y.Array is passed
export const Whiteboard: Component<WhiteboardProps> = (props) => {
  const componentId = crypto.randomUUID()

  const [whiteboardRef, setWhiteboardRef] = createSignal<HTMLElement | undefined>();
  const [excalidrawAPI, setExcalidrawAPI] = createSignal<ExcalidrawImperativeAPI | undefined>();

  const initialData = yjsToExcalidraw(props.yWhiteboard)
  const [lastKnownElements, setLastKnownElements] = createSignal<ExcalidrawElement[]>(initialData);
  const [lastKnownSceneVersion, setLastKnownSceneVersion] = createSignal<number>(getSceneVersion(initialData));
  let root: ReturnType<typeof createRoot>;

  const observer = (event: any, transaction: {origin: string}) => {
    if (transaction.origin === componentId) {
      return
    }

    // console.log('remote changes')
    // elements changed outside this component, reflect the change in excalidraw ui
    const _elements = yjsToExcalidraw(props.yWhiteboard)
    setLastKnownElements(_elements)
    setLastKnownSceneVersion(getSceneVersion(_elements))
    if (excalidrawAPI()) {
      excalidrawAPI().updateScene({elements: _elements})
    }
    // console.log(JSON.parse(JSON.stringify(_elements)))
  }
  props.yWhiteboard.observeDeep(observer)

  onMount(() => {
    if (whiteboardRef()) {
      root = createRoot(whiteboardRef()!);
      renderExcalidraw();
    }
  });

  createEffect(() => {
    if (root) {
      renderExcalidraw();
    }
  });

  createEffect(() => {
    if (props.collaborators && excalidrawAPI()) {
      const collaborators = new Map(Object.entries(props.collaborators)); 
      excalidrawAPI().updateScene({collaborators})
    }
  })

  const renderExcalidraw = () => {
    root.render(
      React.createElement(Excalidraw, {
        initialData: {
          elements: lastKnownElements(),
          appState: { viewBackgroundColor: '#FFFFFF' },
        },
        excalidrawAPI: (api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api),
        onPointerUpdate(payload) {
          props.onCursorUpdate?.(payload)
        },
        onChange: (_elements) => {
          // console.log('changed', _elements)
          const sceneVersion = getSceneVersion(_elements)
          if (sceneVersion <= lastKnownSceneVersion()) {
            // This fires very often even when data is not changed. so keeping a fast procedure to check if anything changed or not
            // The logic is taken from excliadraw repo
            return
          }
          
          _elements = _elements.filter((x) => !x.isDeleted)  // yjs will track deleted elements, so no need to keep it here
          const operations = getDeltaOperationsForYjs(lastKnownElements(), _elements)
          applyOperations(props.yWhiteboard, operations, componentId)

          setLastKnownElements(_elements.map((x) => ({...x})))  // actually we only need id, version. rest all can be ignored
          setLastKnownSceneVersion(sceneVersion)

          // console.log(JSON.parse(JSON.stringify(yjsToExcalidraw(props.yArray))))
        },
      })
    )
  };

  return (
    <div ref={setWhiteboardRef} class="whiteboard"></div>
  );
};