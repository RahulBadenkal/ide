// ../../libs/ts-utils/src/index.ts
var isEven = (n) => {
  return n % 2 === 0;
};

// src/main.ts
import { fileURLToPath } from "url";
import { dirname } from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
console.log("__filename", __filename);
console.log("__dirname", __dirname);
console.log(isEven(2));
console.log("Hello World Sucker");
