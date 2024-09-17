# Demo
https://ide.rahulbadenkal.com/

# Components
- An editor
    - Syntax highlighting
    - Intellisense
    - Autocomplete
    - Tooltip doc support
    - Go to function/variable defintion support in the same file
- Responsive
- Execution
    - Single file
    - Python, Node
- Debugger support
    - Step into my code only and not step into code
- Scratchpad
- Collaboration support
- Sentry
- Posthog
- Server analytics
- Frontend performance analytics
- Load testing in backend
- Architecture write up


# Advanced features
- Testing
- Workspaces - Create more than 1 document
- File system (Multiple file support)
- File search (across multiple files)
- Go to function/variable defintion across multiple files
- debugger - step into code (for builtins)
- Shell
- Support more languages


# Similar websites
- Algoexpert
- Leetcode
- Replit
- codedamn


# Reference links
- Two part series on miro inclusion of code block
    - https://medium.com/miro-engineering/why-we-developed-a-code-block-widget-in-miro-f6c5ec23085c
    - https://medium.com/miro-engineering/how-we-integrated-a-code-editor-on-the-miro-canvas-a41e0eff7f21

- Replit take on code editors
    - https://blog.replit.com/code-editors
    - https://blog.replit.com/codemirror

- https://sourcegraph.com/blog/migrating-monaco-codemirror

- LSP integration in codemirror
  - https://discuss.codemirror.net/t/codemirror-6-and-typescript-lsp/3398
  - https://github.com/FurqanSoftware/codemirror-languageserver

- LSP integration in vscode
  - Guide on how to setup a simple lsp in vscode via an extension - https://code.visualstudio.com/api/language-extensions/language-server-extension-guide

- LSP
  - Video tutoraial on building lsp for vim from TJ - https://www.youtube.com/watch?v=YsdlcQoHqPY
  - Microsoft page on protocol - https://microsoft.github.io/language-server-protocol/
  - Some prebuilt lsps for different languages - https://microsoft.github.io/language-server-protocol/  implementors/servers/
    Some are written in ts (js) so can be directly added to browser without running a server

- DAP
  - Microsoft page on debug adapter protocol - https://microsoft.github.io/debug-adapter-protocol/
  - Some prebuilt dap for different languages - https://microsoft.github.io/debug-adapter-protocol/implementors/adapters - We need to have a server running for this
  - debugpy - DAP implementaion for python - https://github.com/microsoft/debugpy
  - Extension that uses debugpy as the server to add debugger functionality in vs code ui - https://github.com/microsoft/vscode-python-debugger. We need python running on a server for this to work
  - DAP implementation for javascript - https://github.com/microsoft/vscode-js-debug
    This folder in the repo has the server related stuff, other parts of the code is how to show the debugger on vs code UI - https://github.com/microsoft/vscode-js-debug/tree/main/src/dap
  - Replit fork of javascript DAP (above). See diff to to see what replit changed - https://github.com/replit/vscode-js-debug

- Replit syntax highlighting for js - https://github.com/replit/lang-javascript

- Replit indentation marker (like vs code) - https://github.com/replit/codemirror-indentation-markers

- List of all available LSP implementations and the features they support - https://langserver.org/

- https://github.com/FurqanSoftware/codemirror-languageserver/issues/11

- Custom LSP in monaco
  - https://github.com/microsoft/monaco-editor-webpack-plugin/issues/136
  - https://github.com/microsoft/monaco-editor-webpack-plugin/issues/135

- Somebody implemeted yjs in excalidraw -> https://github.com/satoren/y-phoenix-channel, mainly this file: https://github.com/satoren/y-phoenix-channel/blob/bf7c01966e15e5214f8a93f0a6200e6db787ccde/assets/js/excalidraw.tsx

# Additional references
- Tells that in monacl syntax highlighting and lsp features (for json/html/css/js/ts) are tightly coupled -  https://github.com/microsoft/monaco-editor/issues/3126
- Discussion on architecure of hosting lsp servers - https://github.com/TypeFox/monaco-languageclient/discussions/400
 Got the idea of workspaces from here
- Reason why no docstrings in pyright - https://github.com/microsoft/pyright/discussions/7807#discussioncomment-9278736 -> The pyright actually supports docstrings, its just that the python builds is uses strips doc strings from python files

For LSP (workers and sockets)
- For workers, take a look here -> https://github.com/microsoft/monaco-editor/issues/1317
- For socket look at this -> https://github.com/TypeFox/monaco-languageclient/blob/main/packages/examples/src/bare/client.ts
- TODO: Find how to load file for custom syntax highlighting


Architecture doc
- How to bundle monaco (4 parts, main editor, additional, func, syntax highligting, lsp)




1. 