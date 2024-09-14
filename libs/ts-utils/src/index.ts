import fs from "fs"
import { dirname } from "path";
import { fileURLToPath } from "url";


export const isEven = (n: number): boolean => {
  return n % 2 === 0
}

export const getFileContents = () => {
  const data = fs.readFileSync("./file.txt").toString()
  return data
}