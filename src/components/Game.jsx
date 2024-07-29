import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { Navigation2 } from 'lucide-react';
import { createRoot } from 'react-dom/client';

mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdHVzcnIiLCJhIjoiY2x3ejhiaHcxMDRtZzJpc2VtaXFpc3lpeCJ9.8TIx8H5Jdc8-QOtaR9fH_Q';

const Game = ({ gameSettings, setGameResult }) => {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const playerMarker = useRef(null);
  const [errors, setErrors] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const directions = useRef(null);
  const [steps, setSteps] = useState([]);
  const destination = useRef([87.0339, 25.2625]);
  const lastInstruction = useRef('');
  const lastErrorTime = useRef(0);
  const bufferLine = useRef(null);
  const [popupInstruction, setPopupInstruction] = useState('');
  const lastPosition = useRef(null);
  const destinationRadius = 50; // meters
  const destinationCircle = useRef(null);
  const isMoving = useRef(false);
  const lastMoveTime = useRef(0);

  const { instructionType, instructionMode } = gameSettings;

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [87.0023, 25.2561],
      zoom: 17,
    });

    map.current.on('load', () => {
      const start = [87.00158, 25.24429];
  
      const el = document.createElement('div');
      el.className = 'player-marker';
      
      const iconRoot = createRoot(el);
      iconRoot.render(<Navigation2 size={20} color="blue" />);
  
      playerMarker.current = new mapboxgl.Marker(el)
        .setLngLat(start)
        .addTo(map.current);

      directions.current = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        unit: 'metric',
        profile: 'mapbox/walking',
        interactive: false,
      });

      map.current.addControl(directions.current, 'top-left');
      directions.current.setOrigin(start);
      directions.current.setDestination(destination.current);

      directions.current.on('route', (e) => {
        const newSteps = e.route[0].legs[0].steps;
        setSteps(newSteps.map((step, index) => ({ ...step, completed: false, id: index })));
        createBufferLine(e.route[0].geometry.coordinates);
      });

      // Add destination circle
      const circle = turf.circle(destination.current, destinationRadius, { units: 'meters' });
      map.current.addSource('destination-circle', {
        type: 'geojson',
        data: circle
      });
      map.current.addLayer({
        id: 'destination-circle',
        type: 'fill',
        source: 'destination-circle',
        paint: {
          'fill-color': '#FF0000',
          'fill-opacity': 0.2
        }
      });
      destinationCircle.current = circle;

      startGame();
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

  const endGame = useCallback((reachedDestination = false) => {
    setIsStarted(false);
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
  
    window.speechSynthesis.cancel();
  
    setTimeTaken(totalTime);
  
    map.current.dragPan.enable();
    map.current.scrollZoom.enable();
    map.current.keyboard.enable();
  
    const gameResult = {
      time: totalTime,
      errors: errors,
    };

    setGameResult(gameResult);

    localStorage.setItem('gameResult', JSON.stringify(gameResult));

    if (reachedDestination) {
      const message = `Congratulations! You've reached your destination in ${totalTime} seconds with ${errors} errors.`;
      speak(message);
      setPopupInstruction(message);
      setTimeout(() => navigate('/result'), 5000);
    } else {
      navigate('/result');
    }
  }, [startTime, errors, setGameResult, navigate, speak]);

  const checkDestinationReached = useCallback((position) => {
    const point = turf.point([position.lng, position.lat]);
    const isInDestinationCircle = turf.booleanPointInPolygon(point, destinationCircle.current);
    
    if (isInDestinationCircle) {
      endGame(true);
    }
  }, [endGame]);

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
  }, [currentStepIndex, steps, speak]);

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
    
    if (newSteps.length > 0 && isMoving.current) {
      speak(newSteps[0].maneuver.instruction);
    }
    createBufferLine(data.routes[0].geometry.coordinates);
  }, [speak]);

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
    
    if (newPosition.lng !== lastPosition.current?.lng || newPosition.lat !== lastPosition.current?.lat) {
      playerMarker.current.setLngLat(newPosition);
      map.current.setCenter(newPosition);

      const now = Date.now();
      if (!isMoving.current) {
        isMoving.current = true;
        fetchNewRoute(newPosition);
      }
      lastMoveTime.current = now;

      checkDestinationReached(newPosition);
      if (isStarted) {  // Only continue if the game hasn't ended
        checkStepCompletion(newPosition);
        checkForErrors(newPosition);
      }
      
      lastPosition.current = newPosition;
    }
  }, [isStarted, checkStepCompletion, checkForErrors, checkDestinationReached, fetchNewRoute]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    const checkMovement = setInterval(() => {
      const now = Date.now();
      if (now - lastMoveTime.current > 1000) {
        isMoving.current = false;
      }
    }, 1000);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      clearInterval(checkMovement);
    };
  }, [handleKeyPress]);

  return (
    <div className="game-container">
      <div ref={mapContainer} className="map-container" />
      <div className="game-stats" style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(255, 255, 255, 0.8)', padding: '10px', borderRadius: '8px', zIndex: 1 }}>
        <div className="stat">
          <strong>Time Taken:</strong> {timeTaken} seconds
        </div>
        <div className="stat">
          <strong>Errors:</strong> {errors}
        </div>
      </div>
      {instructionMode === 'popup' && popupInstruction && (
        <div className="popup-instruction">
          {popupInstruction}
        </div>
      )}
    </div>
  );
};

export default Game;