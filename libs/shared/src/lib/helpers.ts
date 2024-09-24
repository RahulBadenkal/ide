import { Language } from './types'

export { fromUint8Array as fromUint8ArrayToBase64, toUint8Array as fromBase64ToUint8Array } from 'js-base64'

export const LangToPistonLangMap: {[languageId: string]: {name: string, version: string, fileName: string}} = {
  [Language.PYTHON_3_12]: {name: 'python', version: '3.12.0', fileName: 'code.py'},
  [Language.JS_NODE_20]: {name: 'javascript', version: '20.11.1', fileName: 'code.js'},
  [Language.JS_NODE_20_ES6]: {name: 'javascript', version: '20.11.1', fileName: 'code.mjs'},
}