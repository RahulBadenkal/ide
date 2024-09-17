import { createSignal, Match, Switch } from "solid-js"
import { ApiLoadInfo, ApiState } from "@ide/ts-utils/src/lib/types"
import { BACKEND_SOCKET_BASE_URL } from "@/helpers/constants";
import { useParams } from "@solidjs/router";
import { formUrl } from "@ide/ts-utils/src/lib/utils";
import PageLoader from "@/components/PageLoader/PageLoader";
import { getCookie } from "@ide/browser-utils/src/lib/utils";
import { error } from "console";

// types

// Constants

// Component
export const Workspace = () => {
  // helpers
  const handleIncomingMessage = (message: any) => {
    console.log('incoming, message', message)
    const {type, data} = message

    switch (type) {
      case "init": {
        setPageLoadApiInfo({state: ApiState.LOADED})
        setDocument(data.document)
        setUser(data.user)
        break
      }
      case "error": {
        console.error(data)
      }
    }
  }
  

  // variables
  const params = useParams()
  const socket = new WebSocket(formUrl({basePath: BACKEND_SOCKET_BASE_URL, otherPath: "api/workspace/room", params: {documentId: params.documentId, roomId: params.roomId, 'x-user-id': getCookie('x-user-id')}}))
  const [pageLoadApiInfo, setPageLoadApiInfo] = createSignal<ApiLoadInfo>({state: ApiState.LOADING})
  const [user, setUser] = createSignal()
  const [document, setDocument] = createSignal()

  // computed variables

  // events
  // socket events
  socket.onopen = (event) => {
    console.log('Connected to WebSocket server', event);
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    handleIncomingMessage(message)
  }

  socket.onclose = (event) => {
    console.log('Disconnected from WebSocket server', event);
  }

  socket.onerror = (event) => {
    console.error('WebSocket error', event);
  }


  // init
  // show loader, establish websocket connection, handle error

  // HTML
  return (
    <Switch>
      <Match when={pageLoadApiInfo().state === ApiState.LOADING}>
        <PageLoader />
      </Match>
      <Match when={pageLoadApiInfo().state === ApiState.ERROR}>
        <div>Show page error</div>
        <div>{pageLoadApiInfo().error?.message}</div>
      </Match>
      <Match when={pageLoadApiInfo().state === ApiState.LOADED}>
      <div>{JSON.stringify(user(), null, 2)}</div>
        <div>{JSON.stringify(document(), null, 2)}</div>
      </Match>
    </Switch>
  )
}
