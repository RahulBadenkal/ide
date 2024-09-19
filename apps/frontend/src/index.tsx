/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from "@solidjs/router";
import { getCookie, setCookie } from "@ide/browser-utils/src/lib/utils"

import './tailwind.scss'
import './index.scss'

import { Layout } from './components/Layout';
import { Workspace } from './views/Workspace/Workspace';
import { NotFound } from './views/NotFound';

// Make sure userId header is populated
if (!getCookie('x-user-id')) {
  setCookie('x-user-id', crypto.randomUUID(), 365 * 24 * 60 * 60 * 1000)
}

const root = document.getElementById('root')

render(() => (
    <Router root={Layout}>
        <Route path="/" component={Workspace}></Route>
        <Route path="/documents/:documentId" component={Workspace}></Route>
        <Route path="/rooms/:roomId" component={Workspace}></Route>
        <Route path="*paramName" component={NotFound} />
    </Router>
), root!)
