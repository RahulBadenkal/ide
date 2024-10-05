import { createSignal, onMount, createEffect, type Component } from "solid-js";
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Excalidraw  } from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import * as Y from 'yjs'

import './Whiteboard.styles.scss';
import { applyOperations, getDeltaOperationsForYjs } from "./diff";
import { Collaborator as ExcalidrawCollaborator, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types/types";
import { yjsToExcalidraw } from "./utils";
import * as awarenessProtocol from "y-protocols/awareness.js";

export type WhiteboardProps = {
  yWhiteboard: Y.Array<Y.Map<ExcalidrawElement | string>>,  // {el: ExcalidrawElement, pos: string}
  yAwareness: awarenessProtocol.Awareness,
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
  let collaborators: Map<string, ExcalidrawCollaborator> = new Map();

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

  const awarenessChangeHandler = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }) => {
    const states = props.yAwareness.getStates();

    const _collaborators = new Map(collaborators);
    const update = [...added, ...updated];
    for (const id of update) {
      const state = states.get(id);
      if (!state) {
        continue;
      }

      _collaborators.set(id.toString(), {
        pointer: state.pointer,
        button: state.button,
        selectedElementIds: state.selectedElementIds,
        username: state.user?.name,
        color: state.user?.color,
        avatarUrl: state.user?.avatarUrl,
        userState: state.user?.state,
      });
    }
    for (const id of removed) {
      _collaborators.delete(id.toString());
    }
    _collaborators.delete(props.yAwareness.clientID.toString()); 
    collaborators = _collaborators;
    if (excalidrawAPI()) {
      excalidrawAPI().updateScene({
        collaborators,
      });
    }
  };
  props.yAwareness.on("change", awarenessChangeHandler);

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

  createEffect(() => {})

  const renderExcalidraw = () => {
    root.render(
      React.createElement(Excalidraw, {
        initialData: {
          elements: lastKnownElements(),
          appState: { viewBackgroundColor: '#FFFFFF' },
        },
        excalidrawAPI: (api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api),
        onPointerUpdate(payload) {
          props.yAwareness.setLocalStateField("pointer", payload.pointer);
          this.awareness?.setLocalStateField("button", payload.button);
        },
        onChange: (_elements, _state) => {
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

          // update awareness
          props.yAwareness.setLocalStateField(
            "selectedElementIds",
            _state.selectedElementIds,
          );
        },
      })
    )
  };

  return (
    <div ref={setWhiteboardRef} class="whiteboard"></div>
  );
};