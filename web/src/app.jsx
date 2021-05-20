import React from 'react';
import './app.css';
import Nav from "./components/nav/nav";
import Services from "./components/services/services";
import StreamingBackend from "./streamingBackend";

function App() {
  return (
      <div className="min-h-screen bg-white">
        <StreamingBackend />
        <Nav />

        <div className="py-10">
          <header>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold leading-tight text-gray-900">Environments</h1>
            </div>
          </header>
          <main>
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <div className="px-4 py-8 sm:px-0">
                <Services />
              </div>
            </div>
          </main>
        </div>
      </div>
  )
}

export default App;
