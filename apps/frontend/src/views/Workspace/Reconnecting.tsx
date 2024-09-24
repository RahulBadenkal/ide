import { For } from "solid-js";

export const Reconnecting = () => {
  return (
    <div class="flex space-x-2">
      <For each={[0, 1, 2]}>
        {(item, index) => <span
          class={`w-4 h-4 bg-blue-500 rounded-full animate-bounce`}
          style={"animation-delay: " + `${index() * 0.2}s`}
        />
        }
      </For>
    </div>
  )
}