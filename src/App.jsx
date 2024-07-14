import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdHVzcnIiLCJhIjoiY2x3ejhiaHcxMDRtZzJpc2VtaXFpc3lpeCJ9.8TIx8H5Jdc8-QOtaR9fH_Q';

const App = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const playerMarker = useRef(null);
  const [lng, setLng] = useState(87.0139);
  const [lat, setLat] = useState(25.2425);
  const [zoom, setZoom] = useState(13);
  const [route, setRoute] = useState(null);
  const [errors, setErrors] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [routeSteps, setRouteSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasDeviated, setHasDeviated] = useState(false);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.on('load', () => {
      const start = [87.0139, 25.2425];
      const end = [87.0339, 25.2625];

      new mapboxgl.Marker().setLngLat(start).addTo(map.current);
      new mapboxgl.Marker({ color: 'red' }).setLngLat(end).addTo(map.current);

      const el = document.createElement('div');
      el.className = 'player-marker';
      el.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="blue" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      playerMarker.current = new mapboxgl.Marker(el)
        .setLngLat(start)
        .addTo(map.current);

      fetchRoute(start, end);
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

  const fetchRoute = async (start, end) => {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/walking/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    const routeData = data.routes[0];
    setRoute(routeData.geometry);
    setRouteSteps(routeData.legs[0].steps);

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeData.geometry
        }
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3887be',
        'line-width': 24,
        'line-opacity': 0.75
      }
    });

    updateInstruction(0);
  };

  const speak = useCallback((text) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }, []);

  const handleStart = () => {
    setIsStarted(true);
    setTimeTaken(0);
    setErrors(0);
    setCurrentStepIndex(0);
    setHasDeviated(false);
    speak('Start your journey');
    updateInstruction(0);
    
    map.current.dragPan.disable();
    map.current.scrollZoom.disable();
    map.current.keyboard.disable();
  };

  const handleKeyPress = useCallback((e) => {
    if (!isStarted || !route) return;

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

    checkRouteFollowing(newPosition);
  }, [isStarted, route]);

  const checkRouteFollowing = useCallback((position) => {
    if (!route || !routeSteps.length) return;

    const lineString = turf.lineString(route.coordinates);
    const point = turf.point(position);
    
    // Calculate buffer width in meters based on zoom level
    const bufferWidthPixels = 24;
    const metersPerPixel = (40075016.686 * Math.abs(Math.cos(lat * Math.PI / 180))) / Math.pow(2, map.current.getZoom() + 8);
    const bufferWidthMeters = bufferWidthPixels * metersPerPixel;

    const buffer = turf.buffer(lineString, bufferWidthMeters, { units: 'meters' });
    const isInRouteBuffer = turf.booleanPointInPolygon(point, buffer);

    if (!isInRouteBuffer && !hasDeviated) {
      setErrors((prev) => prev + 1);
      speak("You're off route. Please return to the designated path.");
      setHasDeviated(true);
    } else if (isInRouteBuffer && hasDeviated) {
      setHasDeviated(false);
      updateInstruction(currentStepIndex);
    }

    const snapped = turf.nearestPointOnLine(lineString, point);
    const routeDistance = turf.length(lineString);
    const progress = snapped.properties.location / routeDistance;
    const nextStepIndex = routeSteps.findIndex(
      (step) => step.distance / routeDistance > progress
    );

    if (nextStepIndex !== -1 && nextStepIndex !== currentStepIndex) {
      updateInstruction(nextStepIndex);
    }

    if (progress > 0.99) { // If within 1% of route completion
      setIsStarted(false);
      speak(`You have reached your destination in ${timeTaken} seconds with ${errors} errors.`);
      map.current.dragPan.enable();
      map.current.scrollZoom.enable();
      map.current.keyboard.enable();
    }
  }, [route, routeSteps, currentStepIndex, timeTaken, errors, speak, hasDeviated, lat]);

  const updateInstruction = useCallback((index) => {
    if (index < routeSteps.length) {
      const instruction = routeSteps[index].maneuver.instruction;
      setCurrentStepIndex(index);
      setCurrentInstruction(instruction);
      speak(instruction);
    }
  }, [routeSteps, speak]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  return (
    <div>
      <div ref={mapContainer} className="map-container" />
      <div className="sidebar">
        <div>
          Longitude: {lng.toFixed(4)} | Latitude: {lat.toFixed(4)} | Zoom: {zoom.toFixed(2)}
        </div>
        <div>
          <button onClick={handleStart}>Start</button>
        </div>
        <div>
          Current Instruction: {currentInstruction}
        </div>
        <div>
          Errors: {errors}
        </div>
        <div>
          Time Taken: {timeTaken} seconds
        </div>
      </div>
    </div>
  );
};

export default App;
