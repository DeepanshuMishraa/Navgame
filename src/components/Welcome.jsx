import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = ({ setGameSettings }) => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [playerAge, setPlayerAge] = useState('');
  const [playerGender, setPlayerGender] = useState('');
  const [playerResidence, setPlayerResidence] = useState('');
  const [playerEducation, setPlayerEducation] = useState('');
  const [mapChoice, setMapChoice] = useState('');
  const [playerLanguage, setPlayerLanguage] = useState('');
  const [instructionType, setInstructionType] = useState('egocentric');
  const [instructionMode, setInstructionMode] = useState('voice');

  const handleNext = () => {
    setGameSettings({
      playerName,
      playerAge,
      playerGender,
      playerResidence,
      playerEducation,
      mapChoice,
      playerLanguage,
      instructionType,
      instructionMode
    });
    navigate('/instruction');
  };

  return (
    <div className="welcome-container">
      <h2>Navigation Task</h2>
      <div className="player-info">
        <input
          type="text"
          placeholder="Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Age"
          value={playerAge}
          onChange={(e) => setPlayerAge(e.target.value)}
        />
        <select
          value={playerGender}
          onChange={(e) => setPlayerGender(e.target.value)}
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <select 
          value={playerResidence} 
          onChange={(e) => setPlayerResidence(e.target.value)}
        >
          <option value="">Select Residence</option>
          <option value="Rural">Rural</option>
          <option value="Urban">Urban</option>
          <option value="Semi-Urban">Semi-Urban</option>
        </select>
        <select 
          value={playerEducation} 
          onChange={(e) => setPlayerEducation(e.target.value)}
        >
          <option value="">Select Education</option>
          <option value="Graduate">Graduate</option>
          <option value="post graduate">Post Graduate</option>
        </select>
        <select 
          value={mapChoice} 
          onChange={(e) => setMapChoice(e.target.value)}
        >
          <option value="">Do you use tech maps like Google Maps?</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <select 
          value={playerLanguage} 
          onChange={(e) => setPlayerLanguage(e.target.value)}
        >
          <option value="">Preferred Language</option>
          <option value="Hindi">Hindi</option>
          <option value="English">English</option>
        </select>
      </div>
      <div className="instruction-options">
        <h3>Select Instruction Type:</h3>
        <label>
          <input
            type="radio"
            value="egocentric"
            checked={instructionType === 'egocentric'}
            onChange={() => setInstructionType('egocentric')}
          />
          Egocentric (Left/Right)
        </label>
        <label>
          <input
            type="radio"
            value="geocentric"
            checked={instructionType === 'geocentric'}
            onChange={() => setInstructionType('geocentric')}
          />
          Geocentric (North/South)
        </label>
        <h3>Select Instruction Mode:</h3>
        <label>
          <input
            type="radio"
            value="voice"
            checked={instructionMode === 'voice'}
            onChange={() => setInstructionMode('voice')}
          />
          Voice
        </label>
        <label>
          <input
            type="radio"
            value="popup"
            checked={instructionMode === 'popup'}
            onChange={() => setInstructionMode('popup')}
          />
          Popup
        </label>
      </div>
      <button 
        onClick={handleNext} 
        disabled={!playerName || !playerAge || !playerGender || !playerEducation || !playerResidence || !playerLanguage || !mapChoice}
      >
        Next
      </button>
    </div>
  );
};

export default Welcome;