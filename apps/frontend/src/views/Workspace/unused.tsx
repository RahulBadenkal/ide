  // const _settingsJsx = () => {
  //   const fontSizes = [
  //     "12px", "13px", "14px", "15px", "16px", "17px", "18px", "19px", "20px", "21px"
  //   ]
  //   const keyBindings = ["Standard", "Vim", "Emacs"]

  //   const _menuItem = (fieldName: string, content: any) => {
  //     return <div class="flex items-center justify-between gap-8 py-2">
  //       <div class="flex flex-col gap-0.5 text-sm">
  //         {fieldName}
  //       </div>
  //       <div class="flex-none">
  //         {content}
  //       </div>
  //     </div>
  //   }

  //   const _menuDropdown = (options: any[], value: any, onChange) => {
  //     return <Combobox
  //       options={options}
  //       value={value}
  //       onChange={(e) => onChange(e)}
  //       itemComponent={props => <ComboboxItem class="p-1 text-xs cursor-pointer" item={props.item}>{props.item.rawValue}</ComboboxItem>}
  //     >
  //       <ComboboxTrigger class="h-7">
  //         <div class="text-xs mr-2">{value}</div>
  //       </ComboboxTrigger>
  //       <ComboboxContent class="min-w-[auto]" />
  //     </Combobox>
  //   }

  //   return <Dialog>
  //     <DialogTrigger>
  //       <SettingsIcon size={18} class="cursor-pointer" />
  //     </DialogTrigger>
  //     <DialogContent class="flex h-[460px] min-w-[700px] overflow-auto p-0 max-h-screen !rounded-xl gap-0">
  //       <div class="p-4 app-bg">
  //         <h2 class=" mb-4 text-lg font-medium">Settings</h2>
  //         <div class="grid gap-2">
  //           <For each={[
  //               {id: 'layout', text: 'Layout', icon: <LayoutDashboardIcon size={18} />},
  //               {id: 'code-editor', text: 'Code Editor', icon: <CodeXmlIcon size={18} />},
  //               {id: 'shortcuts', text: 'Shortcuts', icon: <KeyboardIcon size={18} />},
  //               {id: 'others', text: 'Others', icon: <CircleEllipsesIcon size={18} />}
  //             ]}>
  //             {(item, index) =>
  //               <div onClick={(e) => setActiveSettingTab(item.id)} class={"flex items-center gap-x-2 px-3 py-[10px] rounded-lg cursor-pointer min-w-[175px] hover:app-highlighted-bg " + (activeSettingTab() === item.id ? 'app-highlighted-bg' : '')}>
  //                 {item.icon}
  //                 <div class="text-sm">{item.text}</div>
  //               </div>
  //               }
  //           </For>
  //         </div>
  //       </div>
  //       <div class="pt-[60px] h-full flex-1">
  //         <div class="flex h-[100%] flex-col gap-4 overflow-auto px-6">
  //           <div class="mr-1">
  //           <SolidSwitch fallback={<div></div>}>
  //             <Match when={activeSettingTab() === "layout"}>
  //               {_menuItem('Default layout', <Button variant="secondary" class="px-4 py-1 text-xs h-auto">Reset</Button>)}
  //             </Match>
  //             <Match when={activeSettingTab() === "code-editor"}>
  //               {_menuItem('Font size', _menuDropdown(fontSizes, '12px', (e) => console.log(e)))}
  //               {_menuItem('Key binding', _menuDropdown(keyBindings, 'Standard', (e) => console.log(e)))}
  //               {_menuItem('Tab size', _menuDropdown(['2 spaces', '4 spaces'], '2 spaces', (e) => console.log(e)))}
  //             </Match>
  //             <Match when={activeSettingTab() === "shortcuts"}>
  //               <div>Shortcuts</div>
  //             </Match>
  //             <Match when={activeSettingTab() === "others"}>
  //               <div>Others</div>
  //             </Match>
  //           </SolidSwitch>
             
  //           </div>
  //         </div>
  //       </div>
  //     </DialogContent>
  //   </Dialog>
  // }
