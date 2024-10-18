import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"

export enum Role {
  OWNER = 3,
  WRITE = 2,
  READ = 1,
  NO_ACCESS = 0
}

export enum Language {
  PYTHON_3_12 = "python_3_12",
  JS_NODE_20 = "js_node_20",
  JS_NODE_20_ES6 = "js_node_20_es6"
}

export type Collaborator = {
  sessionId: string;
  id: string, 
  name?: string;
  joinedOn: string;
}

type Console = {
  runInfo: {state: ApiState};
  language: Language;
  output: {stream: "stdout" | "stderr", data: string}[];
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
  languageCodeMap: {[languageId: string]: string},
  
  // console
  console?: Console

  // whiteboard variables
  whiteboard: any[],
}

// This is lost if server restarts
export type Awareness = {
  // All run/debug sessions data goes here
  console?: Console

  // collaborators
  collaborators: {[sessionId: string]: Collaborator}
}
