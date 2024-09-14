import {isEven} from "@ide/ts-utils/src"
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('__filename', __filename)
console.log('__dirname', __dirname)
console.log("PORT", process.env.PORT)

console.log(isEven(2))
console.log("Hello World Suck!!!")
// console.log(getFileContents())