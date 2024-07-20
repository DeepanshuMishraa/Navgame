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

      // Create root and render the Navigation icon
      const root = createRoot(el);
      root.render(<Navigation2 size={20} color='blue' />);

      playerMarker.current = new mapboxgl.Marker(el)
        .setLngLat(start)
        .addTo(map.current);

      directions.current = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: 'metric',
        profile: 'mapbox/walking',
        interactive: false
      });

      map.current.addControl(directions.current, 'top-left');
      directions.current.setOrigin(start);
      directions.current.setDestination(destination.current);

      directions.current.on('route', (e) => {
        const newSteps = e.route[0].legs[0].steps;
        setSteps(newSteps.map((step, index) => ({ ...step, completed: false, id: index })));
        if (newSteps.length > 0) {
          speak(newSteps[0].maneuver.instruction);
        }
        createBufferLine(e.route[0].geometry.coordinates);
      });
    });
  }, []);

  const createBufferLine = (coordinates) => {
    if (bufferLine.current) {
      map.current.removeLayer('buffer-line');
      map.current.removeSource('buffer-line');
    }
  
    const route = turf.lineString(coordinates);
    const buffered = turf.buffer(route, 0.06, { units: 'kilometers' }); // 0.06 km = 60 meters
  
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
        'fill-opacity': 0.5
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

  const speak = useCallback((text) => {
    if (text !== lastInstruction.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      lastInstruction.current = text;
    }
  }, []);

  const handleStart = () => {
    if (!isGameActive) {
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
  };

  const endGame = useCallback(() => {
    setIsStarted(false);
    const totalTime = Math.floor((Date.now() - startTime) / 1000);

    window.speechSynthesis.cancel();

    setTimeTaken(totalTime);
    setIsGameActive(false);

    map.current.dragPan.enable();
    map.current.scrollZoom.enable();
    map.current.keyboard.enable();

    // Use a callback with setErrors to get the latest error count
    setErrors(currentErrors => {
      const finalMessage = `You have reached your destination in ${totalTime} seconds with ${currentErrors} errors.`;
      speak(finalMessage);
      return currentErrors; // This doesn't change the error count, just returns the current value
    });
  }, [startTime, speak]);

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
    playerMarker.current.setLngLat(newPosition);
    map.current.setCenter(newPosition);

    checkStepCompletion(newPosition);
    checkForErrors(newPosition);
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
      if (currentStepIndex + 1 < steps.length) {
        speak(steps[currentStepIndex + 1].maneuver.instruction);
      }
    }

    const distanceToDestination = turf.distance(
      turf.point([position.lng, position.lat]),
      turf.point(destination.current),
      { units: 'meters' }
    );

    if (distanceToDestination < 20) {
      endGame();
    } else {
      fetchNewRoute(position);
    }
  }, [currentStepIndex, steps, speak, endGame]);

  const checkForErrors = useCallback((position) => {
    const now = Date.now();
    if (now - lastErrorTime.current < 5000) return; // Prevent error spamming
  
    if (bufferLine.current) {
      const point = turf.point([position.lng, position.lat]);
      const isInsideBuffer = turf.booleanPointInPolygon(point, bufferLine.current);
  
      if (!isInsideBuffer) {  // If player is outside the buffer
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
    if (newSteps.length > 0 && newSteps[0].maneuver.instruction !== lastInstruction.current) {
      speak(newSteps[0].maneuver.instruction);
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
        <button onClick={handleStart} disabled={isGameActive}>
          Start Game
        </button>
        <div className="stat">
          <strong>Time Taken:</strong> {timeTaken} seconds
        </div>
        <div className="stat">
          <strong>Errors:</strong> {errors}
        </div>
        <div className="instructions">
          <strong>Instructions:</strong>
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className={`instruction ${step.completed ? 'completed' : ''} ${index === currentStepIndex ? 'current' : ''}`}
            >
              {step.maneuver.instruction}
            </div>
          ))}
        </div>
        <div className="controls">
          <p>Use arrow keys to move the player</p>
        </div>
      </div>
    </div>
  );
};

export default App;