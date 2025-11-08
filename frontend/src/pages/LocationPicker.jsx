import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Crosshair } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

  
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
    
L.Marker.prototype.options.icon = DefaultIcon;



const LocationPicker = ({ value, onChange, onRemove }) => {
  const [isMapReady, setIsMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Default location (Belgrade, Serbia)
  const defaultLocation = value || {
    lat: 44.8176,
    lng: 20.4569,
    radius: 50,
    address: ''
  };

  const [location, setLocation] = useState(defaultLocation);

  useEffect(() => {
    setIsMapReady(true);
  }, []);

  // Ensure proper cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (err) {
          console.error('Error during final cleanup:', err);
        }
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapReady || mapInstanceRef.current || !mapRef.current) return;

    // Ensure the container has dimensions before initializing
    const container = mapRef.current;
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('Map container not ready yet');
      return;
    }

    console.log('Initializing map...');

    // Add a small delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      try {
        // Double check the container is still valid and has dimensions
        if (!mapRef.current) {
          console.warn('Map ref lost during initialization');
          return;
        }

        const container = mapRef.current;
        if (container.offsetWidth === 0 || container.offsetHeight === 0) {
          console.warn('Map container has no dimensions during initialization');
          return;
        }

        // Check if map is already initialized on this element
        if (container._leaflet_id) {
          console.warn('Map already initialized on this element, skipping');
          return;
        }

        const map = L.map(container, {
          fadeAnimation: false,
          zoomAnimation: false,
          preferCanvas: true
        }).setView([location.lat, location.lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        // Add marker
        const marker = L.marker([location.lat, location.lng], {
          draggable: true
        }).addTo(map);

        // Add radius circle
        const circle = L.circle([location.lat, location.lng], {
          radius: location.radius,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.2
        }).addTo(map);

      // Update location when marker is dragged
      marker.on('dragend', async (e) => {
        try {
          const pos = e.target.getLatLng();
          const newLocation = {
            ...location,
            lat: pos.lat,
            lng: pos.lng
          };

          // Try to get address
          try {
            const address = await reverseGeocode(pos.lat, pos.lng);
            newLocation.address = address;
          } catch (e) {
            // Silent fail
          }

          setLocation(newLocation);
          onChange(newLocation);
          if (circle) {
            circle.setLatLng(pos);
          }
        } catch (err) {
          console.error('Error handling marker drag:', err);
        }
      });

      // Click on map to move marker
      map.on('click', async (e) => {
        try {
          const pos = e.latlng;
          if (marker) marker.setLatLng(pos);
          if (circle) circle.setLatLng(pos);

          const newLocation = {
            ...location,
            lat: pos.lat,
            lng: pos.lng
          };

          // Try to get address
          try {
            const address = await reverseGeocode(pos.lat, pos.lng);
            newLocation.address = address;
          } catch (e) {
            // Silent fail
          }

          setLocation(newLocation);
          onChange(newLocation);
        } catch (err) {
          console.error('Error handling map click:', err);
        }
      });

        mapInstanceRef.current = map;
        markerRef.current = { marker, circle };

        console.log('Map initialized successfully');

        // Force a size recalculation after a short delay
        setTimeout(() => {
          if (map && mapRef.current) {
            try {
              map.invalidateSize();
            } catch (err) {
              console.error('Error invalidating map size:', err);
            }
          }
        }, 250);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }, 100); // Small delay to ensure DOM is ready

    // Cleanup function
    return () => {
      console.log('Cleaning up map');
      clearTimeout(timer);

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off(); // Remove all event listeners
          mapInstanceRef.current.remove();
        } catch (err) {
          console.error('Error removing map:', err);
        }
        mapInstanceRef.current = null;
      }

      // Clean up Leaflet container reference
      if (mapRef.current && mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id;
      }

      markerRef.current = null;
    };
  }, [isMapReady]); // Keep this dependency array minimal

  // Update radius circle when radius changes
  useEffect(() => {
    if (markerRef.current && markerRef.current.circle) {
      try {
        markerRef.current.circle.setRadius(location.radius);
      } catch (err) {
        console.error('Error updating radius:', err);
      }
    }
  }, [location.radius]);

  // Search for location using Nominatim (OpenStreetMap's geocoding)
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Reverse geocoding to get address from coordinates
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || '';
    } catch (error) {
      return '';
    }
  };

  // Select search result
  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    const newLocation = {
      ...location,
      lat,
      lng,
      address: result.display_name
    };

    setLocation(newLocation);
    onChange(newLocation);

    // Update map view and markers (with null checks)
    if (mapInstanceRef.current && markerRef.current) {
      try {
        mapInstanceRef.current.setView([lat, lng], 15);
        if (markerRef.current.marker) {
          markerRef.current.marker.setLatLng([lat, lng]);
        }
        if (markerRef.current.circle) {
          markerRef.current.circle.setLatLng([lat, lng]);
        }
      } catch (err) {
        console.error('Error updating map:', err);
      }
    }

    setSearchResults([]);
    setSearchQuery('');
  };

  // Get user's current location
  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    // Check if map is ready
    if (!mapInstanceRef.current || !markerRef.current) {
      alert('Map is still loading. Please wait a moment and try again.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const newLocation = {
          ...location,
          lat,
          lng
        };

        // Try to get address
        try {
          const address = await reverseGeocode(lat, lng);
          newLocation.address = address;
        } catch (e) {
          // Silent fail
        }

        setLocation(newLocation);
        onChange(newLocation);

        // Update map view and markers (with null checks)
        if (mapInstanceRef.current && markerRef.current) {
          try {
            mapInstanceRef.current.setView([lat, lng], 15);
            if (markerRef.current.marker) {
              markerRef.current.marker.setLatLng([lat, lng]);
            }
            if (markerRef.current.circle) {
              markerRef.current.circle.setLatLng([lat, lng]);
            }
          } catch (err) {
            console.error('Error updating map:', err);
          }
        }
      },
      (error) => {
        let errorMessage = 'Unable to get your location.';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable. Please make sure GPS is enabled.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'Unable to get your location. Please search for a location instead.';
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleRadiusChange = (e) => {
    const radius = parseInt(e.target.value);
    const newLocation = { ...location, radius };
    setLocation(newLocation);
    onChange(newLocation);
  };

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">
          <MapPin className="me-2" size={20} style={{ display: 'inline' }} />
          Question Location
        </h5>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="btn btn-sm btn-outline-danger"
          >
            <X size={16} className="me-1" style={{ display: 'inline' }} />
            Remove Location
          </button>
        )}
      </div>

      {/* Use My Location Button - Prominent */}
      <div className="mb-3">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={!isMapReady || !mapInstanceRef.current}
          className="btn btn-success w-100"
        >
          <Crosshair size={20} className="me-2" style={{ display: 'inline' }} />
          {!isMapReady || !mapInstanceRef.current ? 'Loading Map...' : 'Use My Current Location'}
        </button>
        <small className="text-muted">Quick way to set this question at your current position</small>
      </div>

      {/* Search Bar */}
      <div className="mb-3 position-relative">
        <div className="input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
            placeholder="Or search for a location..."
            className="form-control"
          />
          <button
            type="button"
            onClick={searchLocation}
            disabled={isSearching}
            className="btn btn-primary"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="position-absolute w-100 mt-1 bg-white border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: '240px', overflowY: 'auto' }}>
            {searchResults.map((result, index) => (
              <button
                type="button"
                key={index}
                onClick={() => selectSearchResult(result)}
                className="w-100 px-3 py-2 text-start border-0 border-bottom bg-white"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
              >
                <small>{result.display_name}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="mb-3 position-relative">
        <div
          ref={mapRef}
          className="border rounded"
          style={{ height: '400px', width: '100%', minHeight: '400px' }}
        />
        {(!isMapReady || !mapInstanceRef.current) && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light rounded">
            <div className="text-muted">Loading map...</div>
          </div>
        )}
      </div>

      {/* Radius Selector */}
      <div className="mb-3">
        <label className="form-label">
          Unlock Radius: {location.radius}m
        </label>
        <input
          type="range"
          min="20"
          max="500"
          step="10"
          value={location.radius}
          onChange={handleRadiusChange}
          className="form-range"
        />
        <div className="d-flex justify-content-between">
          <small className="text-muted">20m (Very close)</small>
          <small className="text-muted">500m (Half kilometer)</small>
        </div>
      </div>

      {/* Location Info */}
      {location.address && (
        <div className="alert alert-info mb-3">
          <div><small className="text-muted">Selected Location:</small></div>
          <div><strong>{location.address}</strong></div>
          <div className="mt-1">
            <small className="text-muted">
              Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </small>
          </div>
        </div>
      )}

      <div className="text-muted small fst-italic">
        💡 Click on the map or drag the marker to set the question location. 
        Players will need to be within {location.radius}m to unlock this question.
      </div>
    </div>
  );
};

export default LocationPicker;