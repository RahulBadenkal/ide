# 21 Aug 2024
- Big picture scope

# 22 Aug 2024
- Setup basic ts project for web - Create a template out of it
- Add codemirror and get the basics working
- Get code completion and auto completion to work
- Get goto definition to work
- Execute file

## Language features
- Syntax highlighting
- LSP (auto complete / intellisense, hover, go to definition, go to references, rename symbol (scoped), errors / warnings)
- Debugger
- Code formatter
- Code folding
- font size
- tab config
- rename occurances (Search all and replace)
- Minimap
- Indentation marker

- Setup base project template with vue and codemirror
  Wasted most of the time (around 2-3 hrs) deciding on whetther to use plain ts vs solid. Ultimately setteled on vue
- Also wasted 1-2 hr on deciding whether to use codemirror or monaco. Settled on codemirror. Reasons mainly
  - Less bundle size
  - Documentation seemed better
  - Replit.it uses it
- Went through Microsoft LSP and DAP guides (overview) and found the related libs for LSP/DAP in js and python. Intension is to use intgerate those


# 23 Aug 2024
## Doubts
- Do we need a new lsp server spawned for every client connection?
  From the lsp spec it looks like 1 server connection was meant for 1 client
  But is that fine in my case? I mean i have a single file and every connection will have a different file name so if the above is the case then will the lsp think I have opened 1 big project with many files and still work as expected? Test by keeping multiple connections file name under same directory next to one another and see if importing another file from first works gives auto complete or not

## Additional language features
- import suggestions from std lib

## Journal
- Tried playing around with the ts and python lsp binaries from github, not much luck (didn't know what to do next)
- Saw the code implementation of codemirror-lspserver. Undersdtand what it does
- Read a bit of LSP doc
- Saw first 0.5 hr of TJ's 
- Now, planning to do the following
  - Create a backend socket app
  - Connect codemirror lsp with it
  - In the socket connection transport the messages between code mirror lsp server and python lsp server
- Got lsp working in local codemirror.
- I think I will switch to monaco editor for now since as per this https://langserver.org/, the codemirror 6 client doesn't have all the functionality that monaco lsp has like (jump to def, find references symbol search, etc). Replit has it so maybe they don't use the codemirror-lsp pakcage and use something of their own

# 23 Aug, 25 Aug, 26 Aug, 27 Aug 2024
Wasted more time on monaco package client, gave up finally

# 28 Aug 2024
Final decision
- Use codemirror. If something doesn't exists build from scratch


- Should I use websockets for all purposes since its already created? or should i use a mixture of http + sockets