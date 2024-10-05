import { createEffect, createSignal, onMount } from "solid-js";

import {EditorState, Extension} from "@codemirror/state"
import {EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine  } from "@codemirror/view"
import {defaultKeymap, history, historyKeymap, indentMore} from "@codemirror/commands"
import {defaultHighlightStyle, syntaxHighlighting, indentUnit, indentOnInput, bracketMatching, foldGutter, foldKeymap} from "@codemirror/language"
import {autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap} from "@codemirror/autocomplete"
import {searchKeymap, highlightSelectionMatches} from "@codemirror/search"
import {lintKeymap} from "@codemirror/lint"
import {javascript} from "@codemirror/lang-javascript"
import {python} from "@codemirror/lang-python"

import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import {Awareness} from 'y-protocols/awareness.js'


import './CodeEditor.styles.scss'
import { Language } from "@ide/shared/src/lib/types";

export type CodeEditorProps = {
  language: Language;
  yCode: Y.Text;
  yAwareness: Awareness,
}

const languageSpecificExtensions = (language: Language) => {
  let extensions = []
  switch (language) {
    case Language.JS_NODE_20:
    case Language.JS_NODE_20_ES6: {
      extensions = [
        javascript(),
        indentUnit.of(" ".repeat(2)),
      ]
      break
    }
    case Language.PYTHON_3_12: {
      extensions = [
        python(),
        indentUnit.of(" ".repeat(4)),
      ]
      break
    }
    default: {
      break
    }
  }
  return extensions
}

// TODO: Add support when a new instance of y.Text is passed
export const CodeEditor = (props: CodeEditorProps) => {
  const [editorRef, setEditorRef] = createSignal<HTMLElement>();

  let state: EditorState
  let view: EditorView

  const recreate = () => {
    console.log("Recreate code editor")
    if (view) {
      view.destroy()
    }

    const keyCommands = [
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
      {
        key: "Tab",
        preventDefault: true,
        run: indentMore,
      },
    ];

    const extensions: Extension = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, {fallback: true}),
      bracketMatching(),
      closeBrackets(),
      // autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of(keyCommands),

      // language specific extensions
      ...languageSpecificExtensions(props.language),

      // yjs extension
      yCollab(props.yCode, props.yAwareness, {undoManager:  new Y.UndoManager(props.yCode)})
    ];

    state = EditorState.create({
      doc: props.yCode.toString(),
      extensions,
    });

    view = new EditorView({
      state: state,
      parent: editorRef(),
    });
  }

  onMount(() => {});

  createEffect(() => {
    // on any concerned prop change, rebuild the entire editor
    recreate()
  })

  return (
    <>
      <div ref={setEditorRef} class="editor"></div>
    </>
  )
}
