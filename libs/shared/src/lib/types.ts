export enum Role {
  OWNER = 3,
  WRITE = 2,
  READ = 1,
  NO_ACCESS = 0
}

export enum Language {
  PYTHON_3_12 = "python_3_12",
  JS_NODE_20 = "js_node_20"
}

export type Collaborator = {
  id: string, 
  name: string;
  codeEditorPosition?: any, 
  whiteboardPosition?: any, 
  activeElement?: "code-editor" | "whiteboard" | null
}

// This is persisted
export type Doc = {
  // room related variables
  id: string;
  name: string;
  owner: string;
  sharing: boolean;
  roomId: string;

  // code editor variables
  activeLanguage: Language,
  languageCodeMap: Map<Language, string>,

  // whiteboard variables
  whiteboard: any[],
}

// This is lost if server restarts
export type Awareness = {
  // All run/debug sessions data goes here

  // collaborators
  collaborators: {[id: string]: Collaborator}
}
