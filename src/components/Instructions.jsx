import React from 'react';
import { useNavigate } from 'react-router-dom';

const Instructions = () => {
  const navigate = useNavigate();

  return (
    <div className="instructions-page">
      <h1>Game Instructions</h1>
      <ul>
        <li>Use arrow keys to move the player on the map</li>
        <li>Follow the instructions provided to reach your destination</li>
        <li>Try to minimize errors and complete the task quickly</li>
        <li>The game ends when you reach your destination</li>
      </ul>
      <button onClick={() => navigate('/')}>Start Game</button>
    </div>
  );
};

export default Instructions;