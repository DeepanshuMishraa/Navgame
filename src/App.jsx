import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { createRoot } from 'react-dom/client';
import './App.css';
import * as turf from '@turf/turf';
import { Navigation2 } from 'lucide-react';

mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdHVzcnIiLCJhIjoiY2x3ejhiaHcxMDRtZzJpc2VtaXFpc3lpeCJ9.8TIx8H5Jdc8-QOtaR9fH_Q';

const LEADERBOARD_KEY = 'navigationGameLeaderboard';

const App = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const playerMarker = useRef(null);
  const [errors, setErrors] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const directions = useRef(null);
  const [steps, setSteps] = useState([]);
  const destination = useRef([87.0339, 25.2625]);
  const lastInstruction = useRef('');
  const lastErrorTime = useRef(0);
  const bufferLine = useRef(null);
  const [popupInstruction, setPopupInstruction] = useState('');
  const [instructionType, setInstructionType] = useState('egocentric');
  const [playerName, setPlayerName] = useState('');
  const [playerAge, setPlayerAge] = useState('');
  const [playerGender, setPlayerGender] = useState('');
  const [playerResidence, setPlayerResidence] = useState('');
  const [playerEducation, setPlayerEducation] = useState('');
  const [playerLanguage,setPlayerLanguage] = useState('');
  const [mapChoice,setMapChoice] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const gameCompleted = useRef(false);
  const [instructionMode, setInstructionMode] = useState('voice');
  const lastPosition = useRef(null);
  const lastInstructionTime = useRef(0);

  useEffect(() => {
    const storedLeaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    setLeaderboard(storedLeaderboard);
  }, []);
  
  useEffect(() => {
    localStorage.setItem('navigationGameLeaderboard', JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [87.0023, 25.2561],
      zoom: 15,
    });

    map.current.on('load', () => {
      const start = [87.00158,25.24429]; // Tapashwi Hospital, Bhagalpur

      const el = document.createElement('div');
      el.className = 'player-marker';

      const root = createRoot(el);
      root.render(<Navigation2 size={20} color='blue' />);

      playerMarker.current = new mapboxgl.Marker(el)
        .setLngLat(start)
        .addTo(map.current);

      directions.current = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: 'metric',
        profile: 'mapbox/walking',
        interactive: false,
        styles: [
          {
            id: 'directions-route-line-alt',
            type: 'line',
            source: 'directions',
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#3bb2d0',
              'line-width': 0
            },
            filter: ['all', ['in', '$type', 'LineString'],
              ['in', 'route', 'alternate']]
          },
          {
            id: 'directions-route-line-casing',
            type: 'line',
            source: 'directions',
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#2d5f99',
              'line-width': 0
            },
            filter: ['all', ['in', '$type', 'LineString'],
              ['in', 'route', 'selected']]
          },
          {
            id: 'directions-route-line',
            type: 'line',
            source: 'directions',
            layout: {
              'line-cap': 'butt',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#3bb2d0',
              'line-width': 0
            },
            filter: ['all', ['in', '$type', 'LineString'],
              ['in', 'route', 'selected']]
          },
          {
            id: 'directions-hover-point-casing',
            type: 'circle',
            source: 'directions',
            paint: {
              'circle-radius': 0,
              'circle-color': '#fff'
            },
            filter: ['all', ['in', '$type', 'Point'],
              ['in', 'id', 'hover']]
          },
          {
            id: 'directions-hover-point',
            type: 'circle',
            source: 'directions',
            paint: {
              'circle-radius': 0,
              'circle-color': '#3bb2d0'
            },
            filter: ['all', ['in', '$type', 'Point'],
              ['in', 'id', 'hover']]
          },
          {
            id: 'directions-waypoint-point-casing',
            type: 'circle',
            source: 'directions',
            paint: {
              'circle-radius': 0,
              'circle-color': '#fff'
            },
            filter: ['all', ['in', '$type', 'Point'],
              ['in', 'id', 'waypoint']]
          },
          {
            id: 'directions-waypoint-point',
            type: 'circle',
            source: 'directions',
            paint: {
              'circle-radius': 0,
              'circle-color': '#8a8bc9'
            },
            filter: ['all', ['in', '$type', 'Point'],
              ['in', 'id', 'waypoint']]
          },
          {
            id: 'directions-origin-point',
            type: 'circle',
            source: 'directions',
            paint: {
              'circle-radius': 18,
              'circle-color': '#fffff'
            },
            filter: ['all', ['in', '$type', 'Point'],
              ['in', 'marker-symbol', 'A']]
          },
        ]
      });

      map.current.addControl(directions.current, 'top-left');
      directions.current.setOrigin(start);
      directions.current.setDestination(destination.current);

      directions.current.on('route', (e) => {
        const newSteps = e.route[0].legs[0].steps;
        setSteps(newSteps.map((step, index) => ({ ...step, completed: false, id: index })));
        // if (newSteps.length > 0) {
        //   speak(newSteps[0].maneuver.instruction);
        // }
        createBufferLine(e.route[0].geometry.coordinates);

        if (map.current.getLayer('mapbox-directions-route-line')) {
          map.current.removeLayer('mapbox-directions-route-line');
        }
        if (map.current.getSource('mapbox-directions-route')) {
          map.current.removeSource('mapbox-directions-route');
        }
      });
    });
  }, []);

  const createBufferLine = (coordinates) => {
    if (bufferLine.current) {
      map.current.removeLayer('buffer-line');
      map.current.removeSource('buffer-line');
    }
  
    const route = turf.lineString(coordinates);
    const buffered = turf.buffer(route, 0.06, { units: 'kilometers' });
  
    bufferLine.current = buffered;
  
    map.current.addSource('buffer-line', {
      type: 'geojson',
      data: bufferLine.current
    });
  
    map.current.addLayer({
      id: 'buffer-line',
      type: 'fill',
      source: 'buffer-line',
      layout: {},
      paint: {
        'fill-color': '#888',
        'fill-opacity': 0
      }
    });
  };

  useEffect(() => {
    let interval = null;
    if (isStarted) {
      interval = setInterval(() => {
        setTimeTaken((prev) => prev + 1);
        const position = playerMarker.current.getLngLat();
        checkForErrors(position);
      }, 1000);
    } else if (!isStarted && timeTaken !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isStarted, timeTaken]);

  const convertToEgocentric = (instruction) => {
    return instruction
      .replace(/north/gi, 'forward')
      .replace(/south/gi, 'backward')
      .replace(/east/gi, 'right')
      .replace(/west/gi, 'left');
  };

  const convertToGeocentric = (instruction) => {
    return instruction
      .replace(/forward/gi, 'north')
      .replace(/backward/gi, 'south')
      .replace(/right/gi, 'east')
      .replace(/left/gi, 'west');
  };

  const speak = useCallback((text) => {
    let processedText = text;
    if (instructionType === 'egocentric') {
      processedText = convertToEgocentric(text);
    } else {
      processedText = convertToGeocentric(text);
    }

    if (processedText !== lastInstruction.current) {
      if (instructionMode === 'voice') {
        const utterance = new SpeechSynthesisUtterance(processedText);
        window.speechSynthesis.speak(utterance);
      }
      if (instructionMode === 'popup') {
        setPopupInstruction(processedText);
        setTimeout(() => setPopupInstruction(''), 5000);
      }
      lastInstruction.current = processedText;
    }
  }, [instructionType, instructionMode]);

  const handleStart = () => {
    if (!isGameActive && playerName && playerAge && playerGender) {
      startGame();
    }
  };

  const startGame = () => {
    setIsStarted(true);
    setTimeTaken(0);
    setErrors(0);
    setCurrentStepIndex(0);
    setStartTime(Date.now());
    speak('Start your journey');

    map.current.dragPan.disable();
    map.current.scrollZoom.disable();
    map.current.keyboard.disable();

    setIsGameActive(true);
    gameCompleted.current = false;
  };

  const updateLeaderboard = useCallback((newEntry) => {
    setLeaderboard(prevLeaderboard => {
      const filteredLeaderboard = prevLeaderboard.filter(entry => entry.name !== newEntry.name);
      const newLeaderboard = [...filteredLeaderboard, newEntry];
      newLeaderboard.sort((a, b) => a.score - b.score);
      const topScores = newLeaderboard.slice(0, 10);
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(topScores));
      return topScores;
    });
  }, []);

  const endGame = useCallback(() => {
    if (gameCompleted.current) return;
  
    setIsStarted(false);
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
  
    window.speechSynthesis.cancel();
  
    setTimeTaken(totalTime);
    setIsGameActive(false);
  
    map.current.dragPan.enable();
    map.current.scrollZoom.enable();
    map.current.keyboard.enable();
  
    setErrors(currentErrors => {
      const finalMessage = `You have reached your destination in ${totalTime} seconds with ${currentErrors} errors.`;
      const utterance = new SpeechSynthesisUtterance(finalMessage);
      window.speechSynthesis.speak(utterance);
  
      const newEntry = {
        name: playerName,
        age: playerAge,
        gender: playerGender,
        time: totalTime,
        Residence: playerResidence,
        Education: playerEducation,
        map: mapChoice,
        language: playerLanguage,
        errors: currentErrors,
        score: totalTime + (currentErrors * 10)
      };
  
      updateLeaderboard(newEntry);
  
      gameCompleted.current = true;
      return currentErrors;
    });
  }, [startTime,  playerName, playerAge, playerGender, playerEducation, playerResidence, mapChoice, playerLanguage, updateLeaderboard]);

  const downloadLeaderboard = () => {
    let csv = 'Rank,Name,Age,Gender,Time,Residence,Education,MapChoice,Language,Error,Score\n';
    leaderboard.forEach((player, index) => {
      csv += `${index + 1},${player.name},${player.age},${player.gender},${player.time},${player.Residence},${player.Education},${player.map},${player.language},${player.errors},${player.score}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'leaderboard.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleKeyPress = useCallback((e) => {
    if (!isStarted) return;

    const currentPosition = playerMarker.current.getLngLat();
    let newLng = currentPosition.lng;
    let newLat = currentPosition.lat;
    const moveDistance = 0.0001;

    switch (e.key) {
      case 'ArrowUp': newLat += moveDistance; break;
      case 'ArrowDown': newLat -= moveDistance; break;
      case 'ArrowLeft': newLng -= moveDistance; break;
      case 'ArrowRight': newLng += moveDistance; break;
      default: return;
    }

    const newPosition = { lng: newLng, lat: newLat };
    
    // Only update if the position has changed
    if (newPosition.lng !== lastPosition.current?.lng || newPosition.lat !== lastPosition.current?.lat) {
      playerMarker.current.setLngLat(newPosition);
      map.current.setCenter(newPosition);

      checkStepCompletion(newPosition);
      checkForErrors(newPosition);
      
      lastPosition.current = newPosition;
    }
  }, [isStarted]);

  const checkStepCompletion = useCallback((position) => {
    if (currentStepIndex >= steps.length) return;

    const currentStep = steps[currentStepIndex];
    const stepEndPoint = currentStep.maneuver.location;

    const distance = turf.distance(
      turf.point([position.lng, position.lat]),
      turf.point(stepEndPoint),
      { units: 'meters' }
    );

    if (distance < 10) {
      setSteps(prevSteps => prevSteps.map((step, index) => 
        index === currentStepIndex ? { ...step, completed: true } : step
      ));
      setCurrentStepIndex(prevIndex => prevIndex + 1);
      
      // Provide immediate instruction for the next step
      if (currentStepIndex + 1 < steps.length) {
        const now = Date.now();
        if (now - lastInstructionTime.current > 2000) { // Prevent instructions too close together
          speak(steps[currentStepIndex + 1].maneuver.instruction);
          lastInstructionTime.current = now;
        }
      }
    }

    const distanceToDestination = turf.distance(
      turf.point([position.lng, position.lat]),
      turf.point(destination.current),
      { units: 'meters' }
    );

    if (distanceToDestination < 60) {
      endGame();
    } else {
      fetchNewRoute(position);
    }
  }, [currentStepIndex, steps, speak, endGame]);

  const checkForErrors = useCallback((position) => {
    const now = Date.now();
    if (now - lastErrorTime.current < 5000) return;
  
    if (bufferLine.current) {
      const point = turf.point([position.lng, position.lat]);
      const isInsideBuffer = turf.booleanPointInPolygon(point, bufferLine.current);
  
      if (!isInsideBuffer) {
        setErrors(prevErrors => prevErrors + 1);
        speak("You've deviated from the correct path. Please correct your course.");
        lastErrorTime.current = now;
      }
    }
  }, [speak]);

  const fetchNewRoute = useCallback(async (position) => {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${position.lng},${position.lat};${destination.current[0]},${destination.current[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    const newSteps = data.routes[0].legs[0].steps;
    setSteps(newSteps.map((step, index) => ({ ...step, completed: false, id: index })));
    
    // Provide immediate instruction for the first step of the new route
    if (newSteps.length > 0 && newSteps[0].maneuver.instruction !== lastInstruction.current) {
      const now = Date.now();
      if (now - lastInstructionTime.current > 2000) { // Prevent instructions too close together
        speak(newSteps[0].maneuver.instruction);
        lastInstructionTime.current = now;
      }
    }
    createBufferLine(data.routes[0].geometry.coordinates);
  }, [speak]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

   return (
    <div className="app-container">
      <div ref={mapContainer} className="map-container" />
      <div className="sidebar">
        <h2>Navigation Task</h2>
        {!isGameActive && (
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
              <option value="">Do you use tech maps like google maps?</option>
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
        )}
        {!isGameActive && (
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
        )}
        <button 
          onClick={handleStart} 
          disabled={isGameActive || !playerName || !playerAge || !playerGender || !playerEducation || !playerResidence || !playerLanguage || !mapChoice}
        >
          Start Game
        </button>
        {isGameActive && (
          <>
            <div className="stat">
              <strong>Time Taken:</strong> {timeTaken} seconds
            </div>
            <div className="stat">
              <strong>Errors:</strong> {errors}
            </div>
            <div className="controls">
              <p>Use arrow keys to move the player</p>
            </div>
          </>
        )}
        {!isGameActive && leaderboard.length > 0 && (
          <div className="leaderboard">
            <h3>Score</h3>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Name</th>
                  <th>Time</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((player, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{player.name}</td>
                    <td>{player.time}s</td>
                    <td>{player.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={downloadLeaderboard}>Download Score</button>
          </div>
        )}
      </div>
      {instructionMode === 'popup' && popupInstruction && (
        <div className="popup-instruction">
          {popupInstruction}
        </div>
      )}
    </div>
  );
};

export default App;