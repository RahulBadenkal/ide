/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route, useLocation } from "@solidjs/router";
import { getCookie, setCookie } from "@ide/browser-utils/src/lib/utils"
import posthog from 'posthog-js'

import './tailwind.scss'
import './index.scss'

import { Layout } from './components/Layout';
import { Workspace } from './views/Workspace/Workspace';
import { NotFound } from './views/NotFound';
import { POSTHOG_HOST, POSTHOG_KEY } from './helpers/constants';
import { createEffect } from 'solid-js';


posthog.init(POSTHOG_KEY,
    {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
    }
)

// Make sure userId header is populated
if (!getCookie('x-user-id')) {
  setCookie('x-user-id', crypto.randomUUID(), 365 * 24 * 60 * 60 * 1000)
}

const root = document.getElementById('root')

const App = (props: any) => {
  console.log('INIT')
  const location = useLocation();  // Get the current location from the router

  // Track page views globally in one place
  createEffect(() => {
    console.log('on page view change')
    posthog.capture('$pageview', { path: location.pathname });
  });
  
  return <Layout {...props}/>
}


render(() => (
    <Router root={App}>
        <Route path="/" component={Workspace}></Route>
        <Route path="/documents/:documentId" component={Workspace}></Route>
        <Route path="/rooms/:roomId" component={Workspace}></Route>
        <Route path="*paramName" component={NotFound} />
    </Router>
), root!)
