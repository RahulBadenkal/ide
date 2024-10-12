- Indentation in code mirror
https://github.com/replit/codemirror-indentation-markers

- Codemirror minimpa
https://github.com/replit/codemirror-minimap


## LSP
- A guide to intercept vs code lsp server for rust-analyzer and view docs
https://medium.com/@techhara/sniffing-lsp-communications-54f27b539685


### Plan
- hover
    - fire when cursor on text for > threshold (0.3 sec), already implemented in code mirror
- definition
    - fire when ctrl is pressed and cursor lands on a new token
    - if 
        - if it returns a list of 0 element -> don't do anything
        - if it returns a list of 1 element and the range of src != target, then jump to that definition
        - else if it returns a list of 1 element and the range of src = target, then call references as the cursor is at the definition.
        - else (it returns a list > 1), multiple implementations found. Show the multiple defintions UI
- references
    - fire when called explicitely
    - if 
        - if it returns a list with 0 element -> don't do anything
        - else if it returns a list of 1 element -> jump to that reference
        - else (it returns a list > 1), multiple referebces found. Show the multiple references UI
