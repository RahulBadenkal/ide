import { createEffect, createSignal, onMount } from "solid-js";

import {EditorState, Extension} from "@codemirror/state"
import {EditorView, keymap, lineNumbers, highlightActiveLineGutter  } from "@codemirror/view"
import {defaultKeymap, indentMore} from "@codemirror/commands"

import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import {Awareness} from 'y-protocols/awareness.js'


import './CodeEditor.styles.scss'
import { Language } from "@ide/shared/src/lib/types";

export type CodeEditorProps = {
  language: Language;
  yCode: Y.Text;
  awareness?: Awareness,
}


// TODO: Add support when a new instance of y.Text is passed
export const CodeEditor = (props: CodeEditorProps) => {
  const [editorRef, setEditorRef] = createSignal<HTMLElement>();

  const undoManager = new Y.UndoManager(props.yCode)
  let state: EditorState
  let view: EditorView

  const recreate = () => {
    console.log("Recreate code editor")
    if (view) {
      view.destroy()
    }

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
      yCollab(props.yCode, null, {undoManager: false})
    ];

    state = EditorState.create({
      doc: props.yCode.toString(),
      extensions: extensions,
    });

    view = new EditorView({
      state: state,
      parent: editorRef(),
    });
  }

  onMount(() => {});

  createEffect(() => {
    recreate()
  })

  return (
    <>
      <div ref={setEditorRef} class="editor"></div>
    </>
  )
}
