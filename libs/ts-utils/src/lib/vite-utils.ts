// export const importStaticFileAsModule = (modulePath: string) => {
//   // https://github.com/vitejs/vite/issues/14850#issuecomment-1907266103
//   if ((import.meta as any).env.DEV) {
//     return import(/* @vite-ignore */ `${modulePath}?${Date.now()}`);  // ${modulePath}?${Date.now()} to ignore caching
//   } else {
//     return import(/* @vite-ignore */ modulePath);
//   }
// }