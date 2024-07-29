import React from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = ({ setPlayerInfo, setGameSettings }) => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const playerInfo = {
      name: formData.get('name'),
      age: formData.get('age'),
      gender: formData.get('gender'),
      residence: formData.get('residence'),
      education: formData.get('education'),
      mapChoice: formData.get('mapChoice'),
      language: formData.get('language')
    };
    const gameSettings = {
      instructionType: formData.get('instructionType'),
      instructionMode: formData.get('instructionMode')
    };

    setPlayerInfo(playerInfo);
    setGameSettings(gameSettings);
    navigate('/instructions');
  };

  return (
    <div className="welcome-page">
      <h1>Welcome to the Navigation Game</h1>
      <form onSubmit={handleSubmit}>
        <input name="name" type="text" placeholder="Name" required />
        <input name="age" type="number" placeholder="Age" required />
        <select name="gender" required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <select name="residence" required>
          <option value="">Select Residence</option>
          <option value="Rural">Rural</option>
          <option value="Urban">Urban</option>
          <option value="Semi-Urban">Semi-Urban</option>
        </select>
        <select name="education" required>
          <option value="">Select Education</option>
          <option value="Graduate">Graduate</option>
          <option value="post graduate">Post Graduate</option>
        </select>
        <select name="mapChoice" required>
          <option value="">Do you use tech maps like Google Maps?</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
        <select name="language" required>
          <option value="">Preferred Language</option>
          <option value="Hindi">Hindi</option>
          <option value="English">English</option>
        </select>

        <div className="instruction-options">
          <h3>Select Instruction Type:</h3>
          <label>
            <input type="radio" name="instructionType" value="egocentric" defaultChecked />
            Egocentric (Left/Right)
          </label>
          <label>
            <input type="radio" name="instructionType" value="geocentric" />
            Geocentric (North/South)
          </label>
          <h3>Select Instruction Mode:</h3>
          <label>
            <input type="radio" name="instructionMode" value="voice" defaultChecked />
            Voice
          </label>
          <label>
            <input type="radio" name="instructionMode" value="popup" />
            Popup
          </label>
        </div>

        <button type="submit">Next</button>
      </form>
    </div>
  );
};

export default Welcome;