import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Instruction from './components/Instructions';
import Welcome from './components/Welcome';
import Game from './components/Game';
import Result from './components/Result';
import './App.css'
const App = () => {
  const [gameSettings, setGameSettings] = useState({});
  const [gameResult, setGameResult] = useState({});

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome setGameSettings={setGameSettings} />} />
        <Route path="/instruction" element={<Instruction />} />
        <Route path="/game" element={<Game gameSettings={gameSettings} setGameResult={setGameResult} />} />
        <Route path="/result" element={<Result gameSettings={gameSettings} gameResult={gameResult} />} />
      </Routes>
    </Router>
  );
};

export default App;