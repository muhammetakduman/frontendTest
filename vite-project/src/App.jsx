import { useState } from 'react'
import './App.css'
import Navbar from './components/navbar.jsx';
import Map from './components/map.jsx';

function App() {
  return (
    <div className="App">
      <Navbar/>
      <Map/>
    </div>
  );
}
export default App;