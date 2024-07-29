import React from 'react';
import { useNavigate } from 'react-router-dom';

const Instruction = () => {
  const navigate = useNavigate();

  const handleProceed = () => {
    navigate('/game');
  };

  return (
    <div className="instruction-container">
      <h2>Game Instructions</h2>
      <ul>
        <li>Use arrow keys to move the player on the map.</li>
        <li>Follow the instructions provided to reach your destination.</li>
        <li>Deviating from the correct path will result in errors.</li>
        <li>Try to reach the destination with minimal errors and in the shortest time possible.</li>
      </ul>
      <button onClick={handleProceed}>Proceed to Game</button>
    </div>
  );
};

export default Instruction;