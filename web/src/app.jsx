import React, {useEffect, useState} from 'react';
import './app.css';
import Nav from "./components/nav/nav";
import Services from "./components/services/services";
import StreamingBackend from "./streamingBackend";
import {createStore} from 'redux';
import {ACTION_TYPE_ENVS, rootReducer} from './redux/redux';
import {BrowserRouter as Router, Redirect, Route, Switch, withRouter} from "react-router-dom";
import GimletClient from "./client/client";


function App() {
  const [store] = useState(createStore(rootReducer));
  store.subscribe(() => {
    console.log(store.getState());
  });

  const [gimletClient] = useState(new GimletClient(
    (response) => {
      if (response.status === 401) {
        window.location.replace("/login");
      } else {
        console.log(`${response.status}: ${response.statusText} on ${response.path}`);
      }
    }
  ));

  useEffect(() => {
    gimletClient.getEnvs()
      .then(data => store.dispatch({type: ACTION_TYPE_ENVS, payload: data}), () => {/* Generic error handler deals with it */
      });
  }, [gimletClient, store]);

  const NavBar = withRouter(props => <Nav {...props}/>);

  return (
    <Router>
      <Route exact path="/">
        <Redirect to="/environments"/>
      </Route>

      <StreamingBackend store={store}/>

      <div className="min-h-screen bg-white">
        <NavBar/>
        <div className="py-10">
          <Switch>
            <Route path="/environments">
              <header>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h1 className="text-3xl font-bold leading-tight text-gray-900">Environments</h1>
                </div>
              </header>
              <main>
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                  <div className="px-4 py-8 sm:px-0">
                    <Services
                      store={store}
                    />
                  </div>
                </div>
              </main>
            </Route>

            <Route path="/services">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold leading-tight text-gray-900">Services</h1>
              </div>
            </Route>

            <Route path="/settings">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold leading-tight text-gray-900">Settings</h1>
              </div>
            </Route>
          </Switch>
        </div>
      </div>
    </Router>
  )
}

export default App;
