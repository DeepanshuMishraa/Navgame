import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import * as turf from '@turf/turf';

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
  const [speechQueue, setSpeechQueue] = useState([]);
  const isSpeaking = useRef(false);
  const lastInstruction = useRef('');

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [87.0023, 25.2561],
      zoom: 13,
    });

    map.current.on('load', () => {
      const start = [87.0023, 25.2561]; // Tapashwi Hospital, Bhagalpur

      const el = document.createElement('div');
      el.className = 'player-marker';
      el.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="blue" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

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
      });
    });
  }, []);

  useEffect(() => {
    let interval = null;
    if (isStarted) {
      interval = setInterval(() => {
        setTimeTaken((prev) => prev + 1);
      }, 1000);
    } else if (!isStarted && timeTaken !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isStarted, timeTaken]);

  const speak = useCallback((text) => {
    if (text !== lastInstruction.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        isSpeaking.current = false;
        setSpeechQueue(prevQueue => prevQueue.slice(1));
      };
      window.speechSynthesis.speak(utterance);
      isSpeaking.current = true;
    }
    lastInstruction.current = text;
  }, []);
  

  useEffect(() => {
    const speakFromQueue = () => {
      if (speechQueue.length > 0 && !isSpeaking.current) {
        isSpeaking.current = true;
        const utterance = new SpeechSynthesisUtterance(speechQueue[0]);
        utterance.onend = () => {
          isSpeaking.current = false;
          setSpeechQueue(prevQueue => prevQueue.slice(1));
        };
        speechSynthesis.speak(utterance);
      }
    };

    speakFromQueue();
  }, [speechQueue]);

  const handleStartStop = () => {
    if (isGameActive) {
      endGame();
    } else {
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
  
    // Clear speech queue and stop any ongoing speech
    window.speechSynthesis.cancel();
    setSpeechQueue([]);
  
    // Prepare the final message
    const finalMessage = `You have reached your destination in ${totalTime} seconds with ${errors} errors.`;
  
    // Speak the final message
    speak(finalMessage);
  
    setTimeTaken(totalTime);
    setIsGameActive(false);
  
    map.current.dragPan.enable();
    map.current.scrollZoom.enable();
    map.current.keyboard.enable();
    window.removeEventListener('keydown', handleKeyPress);
  }, [startTime, errors, speak]);
  

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

    const newPosition = [newLng, newLat];
    playerMarker.current.setLngLat(newPosition);
    map.current.setCenter(newPosition);

    checkStepCompletion(newPosition);
  }, [isStarted]);

  const checkStepCompletion = useCallback((position) => {
    if (currentStepIndex >= steps.length) return;

    const currentStep = steps[currentStepIndex];
    const stepEndPoint = currentStep.maneuver.location;

    const distance = turf.distance(
      turf.point(position),
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
    } else {
      if (currentStep.maneuver.type.includes('turn')) {
        const bearingToNextPoint = turf.bearing(
          turf.point(position),
          turf.point(stepEndPoint)
        );
        const playerBearing = map.current.getBearing();
        const bearingDiff = Math.abs(bearingToNextPoint - playerBearing);
        
        if (bearingDiff > 45 && bearingDiff < 315) {
          setErrors(prevErrors => prevErrors + 1);
          speak("You missed the turn. Please correct your course.");
        }
      }
    }

    if (currentStepIndex === steps.length - 1 && distance < 10) {
      endGame();
    } else {
      fetchNewRoute(position);
    }
  }, [currentStepIndex, steps, speak]);

  const fetchNewRoute = useCallback(async (position) => {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${position[0]},${position[1]};${destination.current[0]},${destination.current[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    const newSteps = data.routes[0].legs[0].steps;
    setSteps(newSteps.map((step, index) => ({ ...step, completed: false, id: index })));
    if (newSteps.length > 0 && newSteps[0].maneuver.instruction !== lastInstruction.current) {
      speak(newSteps[0].maneuver.instruction);
    }
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
        <h2>Navigation Game</h2>
        <button onClick={handleStartStop}>
          {isGameActive ? 'Stop Game' : 'Start Game'}
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