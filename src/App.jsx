import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

mapboxgl.accessToken = 'pk.eyJ1IjoidGVzdHVzcnIiLCJhIjoiY2x3ejhiaHcxMDRtZzJpc2VtaXFpc3lpeCJ9.8TIx8H5Jdc8-QOtaR9fH_Q';

const App = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const playerMarker = useRef(null);
  const [lng, setLng] = useState(87.0139); // Bhagalpur longitude
  const [lat, setLat] = useState(25.2425); // Bhagalpur latitude
  const [zoom, setZoom] = useState(13);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [route, setRoute] = useState([]);
  const [errors, setErrors] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [routeSteps, setRouteSteps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [expectedDirection, setExpectedDirection] = useState(null);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
    });

    //
    map.current.on('load', () => {
      // Set predefined start and end points in Bhagalpur
      const start = { lng: 87.0139, lat: 25.2425 }; // Bhagalpur Junction railway station
      const end = { lng: 87., lat: 25.2551 }; // Bhagalpur College of Engineering
      setStartPoint(start);
      setEndPoint(end);

      // Add markers to the map
      new mapboxgl.Marker().setLngLat([start.lng, start.lat]).addTo(map.current);
      new mapboxgl.Marker({ color: 'red' }).setLngLat([end.lng, end.lat]).addTo(map.current);

      // Add player marker
      playerMarker.current = new mapboxgl.Marker({ color: 'blue' }).setLngLat([start.lng, start.lat]).addTo(map.current);

      // Fetch route from start to end
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
      `https://api.mapbox.com/directions/v5/mapbox/walking/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    const routeCoordinates = data.routes[0].geometry.coordinates;
    setRoute(routeCoordinates);
    setRouteSteps(data.routes[0].legs[0].steps);

    const routeGeoJSON = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates,
      },
    };

    if (map.current.getSource('route')) {
      map.current.getSource('route').setData(routeGeoJSON);
    } else {
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: {
          type: 'geojson',
          data: routeGeoJSON,
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#3887be',
          'line-width': 20, // Increased line width
          'line-opacity': 0.75,
        },
      });
    }

    setCurrentInstruction(data.routes[0].legs[0].steps[0].maneuver.instruction);
    setExpectedDirection(data.routes[0].legs[0].steps[0].maneuver.modifier);
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  };

  const handleStart = () => {
    setIsStarted(true);
    setTimeTaken(0);
    setErrors(0);
    setCurrentStepIndex(0);
    speak('Start your journey');
    updateInstruction();
    
    // Lock the map view
    map.current.dragPan.disable();
    map.current.scrollZoom.disable();
    map.current.keyboard.disable();
  };

  const handleKeyPress = (e) => {
    if (!isStarted) return;

    const [lng, lat] = playerMarker.current.getLngLat().toArray();
    let newLng = lng;
    let newLat = lat;
    const moveDistance = 0.0001; // Increased movement distance

    switch (e.key) {
      case 'ArrowUp':
        newLat += moveDistance;
        break;
      case 'ArrowDown':
        newLat -= moveDistance;
        break;
      case 'ArrowLeft':
        newLng -= moveDistance;
        if (expectedDirection !== 'left') setErrors((prev) => prev + 1);
        break;
      case 'ArrowRight':
        newLng += moveDistance;
        if (expectedDirection !== 'right') setErrors((prev) => prev + 1);
        break;
      default:
        return;
    }

    playerMarker.current.setLngLat([newLng, newLat]);
    checkRouteFollowing(newLng, newLat);

    // Center the map on the player's new position
    map.current.setCenter([newLng, newLat]);
  };

  const checkRouteFollowing = (lng, lat) => {
    const tolerance = 0.0005; // Increased tolerance for being on route
    const nearestPoint = route.find((point) => {
      return Math.abs(point[0] - lng) < tolerance && Math.abs(point[1] - lat) < tolerance;
    });

    if (nearestPoint) {
      const nextStepIndex = route.findIndex((point) => {
        return Math.abs(point[0] - lng) < tolerance && Math.abs(point[1] - lat) < tolerance;
      });
      if (nextStepIndex !== -1 && nextStepIndex > currentStepIndex) {
        setCurrentStepIndex(nextStepIndex);
        updateInstruction();
      }
    }

    if (Math.abs(lng - endPoint.lng) < tolerance && Math.abs(lat - endPoint.lat) < tolerance) {
      setIsStarted(false);
      speak(`You have reached your destination in ${timeTaken} seconds with ${errors} errors.`);
      
      // Unlock the map view
      map.current.dragPan.enable();
      map.current.scrollZoom.enable();
      map.current.keyboard.enable();
    }
  };

  const updateInstruction = () => {
    if (currentStepIndex < routeSteps.length) {
      const instruction = routeSteps[currentStepIndex].maneuver.instruction;
      const modifier = routeSteps[currentStepIndex].maneuver.modifier;
      setCurrentInstruction(instruction);
      setExpectedDirection(modifier);
      speak(instruction);
    }
  };

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
          <p>Errors: {errors}</p>
          <p>Time Taken: {timeTaken} seconds</p>
          <p>Instruction: {currentInstruction}</p>
        </div>
      </div>
    </div>
  );
};

export default App;
