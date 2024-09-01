import { useState } from 'react'
import './App.css'
import Navbar from './components/navbar.jsx';
import Map from './components/map.jsx';
import { MapProvider } from './context/MapContext.jsx';

function App() {
  return (
    <div className="App">
      <Navbar/>
      <MapProvider>
        <Map/>
      </MapProvider>
    </div>
  );
}
export default App;