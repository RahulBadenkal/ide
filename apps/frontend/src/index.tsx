/* @refresh reload */
import { render } from 'solid-js/web'
import { Router, Route } from "@solidjs/router";

import './tailwind.scss'
import './index.scss'

import { Layout } from './components/Layout';
import { Workspace } from './views/Workspace/Workspace';
import { NotFound } from './views/NotFound';
import { Dummy } from './views/Dummy';


const root = document.getElementById('root')

render(() => (
    <Router root={Layout}>
        <Route path="/" component={Workspace}></Route>
        <Route path="/dummy" component={Dummy}></Route>
        <Route path="/workspace" component={Workspace}></Route>
        <Route path="*paramName" component={NotFound} />
    </Router>
), root!)
