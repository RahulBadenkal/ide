import { createEffect, createSignal, onMount } from "solid-js";

import {EditorState, Extension} from "@codemirror/state"
import {EditorView, keymap, lineNumbers, highlightActiveLineGutter  } from "@codemirror/view"
import {defaultKeymap, indentMore} from "@codemirror/commands"

import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import {Awareness} from 'y-protocols/awareness.js'


import './CodeEditor.styles.scss'

export type CodeEditorProps = {
  yCode: Y.Text
  awareness?: Awareness,
}

export const CodeEditor = (props: CodeEditorProps) => {
  const [editorRef, setEditorRef] = createSignal<HTMLElement>();

  const undoManager = new Y.UndoManager(props.yCode)

  onMount(() => {
    const keyCommands = [
      ...defaultKeymap,
      {
        key: "Tab",
        preventDefault: true,
        run: indentMore,
      },
    ];

    const extensions: Extension = [
      lineNumbers(),
      highlightActiveLineGutter(),
      keymap.of(keyCommands),
      // yCollab(props.yText, props.awareness, {undoManager}),
      // yCollab(props.yCode, null, {undoManager})
      yCollab(props.yCode, null, {undoManager: false})
    ];

    let startState = EditorState.create({
      doc: props.yCode.toString(),
      extensions: extensions,
    });

    let view = new EditorView({
      state: startState,
      parent: editorRef(),
    });

  
  });

  return (
    <>
      <div ref={setEditorRef} class="editor"></div>
    </>
  )
}
