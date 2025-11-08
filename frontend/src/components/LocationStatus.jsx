import React, { useEffect, useRef, useState } from 'react';
import { Lock, RefreshCw, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistance } from '../utils/geolocation';

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

/**
 * LocationStatus component - Shows locked/unlocked state for location-based questions
 */
const LocationStatus = ({
  isLocked,
  distance,
  targetLocation,
  userLocation,
  onRefresh,
  isRefreshing
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

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
          console.error('Error during LocationStatus cleanup:', err);
        }
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapReady || mapInstanceRef.current || !mapRef.current || !targetLocation) return;

    // Ensure the container has dimensions
    const container = mapRef.current;
    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
      console.warn('LocationStatus map container not ready');
      return;
    }

    // Check if already initialized
    if (container._leaflet_id) {
      console.warn('LocationStatus map already initialized, skipping');
      return;
    }

    const timer = setTimeout(() => {
      try {
        if (!mapRef.current) return;

        const map = L.map(mapRef.current, {
          fadeAnimation: false,
          zoomAnimation: false,
          preferCanvas: true
        }).setView(
          [targetLocation.lat, targetLocation.lng],
          14
        );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      // Add target location marker (red)
      const targetMarker = L.marker([targetLocation.lat, targetLocation.lng], {
        icon: L.icon({
          iconUrl: icon,
          shadowUrl: iconShadow,
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })
      }).addTo(map);

      targetMarker.bindPopup('<strong>Target Location</strong>');

      // Add radius circle
      const circle = L.circle([targetLocation.lat, targetLocation.lng], {
        radius: targetLocation.radius,
        color: isLocked ? '#dc3545' : '#28a745',
        fillColor: isLocked ? '#dc3545' : '#28a745',
        fillOpacity: 0.2
      }).addTo(map);

      // Add user location marker (blue) if available
      if (userLocation) {
        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: L.icon({
            iconUrl: icon,
            shadowUrl: iconShadow,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            className: 'user-location-marker'
          })
        }).addTo(map);

        userMarker.bindPopup('<strong>Your Location</strong>');

        // Adjust map to show both markers
        const bounds = L.latLngBounds([
          [targetLocation.lat, targetLocation.lng],
          [userLocation.lat, userLocation.lng]
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }

        mapInstanceRef.current = map;

        console.log('LocationStatus map initialized successfully');

        // Force size recalculation
        setTimeout(() => {
          if (map && mapRef.current) {
            try {
              map.invalidateSize();
            } catch (err) {
              console.error('Error invalidating LocationStatus map size:', err);
            }
          }
        }, 250);
      } catch (error) {
        console.error('Error initializing LocationStatus map:', error);
      }
    }, 100);

    return () => {
      console.log('Cleaning up LocationStatus map initialization');
      clearTimeout(timer);

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (err) {
          console.error('Error removing LocationStatus map:', err);
        }
        mapInstanceRef.current = null;
      }

      // Clean up Leaflet container reference
      if (mapRef.current && mapRef.current._leaflet_id) {
        delete mapRef.current._leaflet_id;
      }
    };
  }, [isMapReady, targetLocation, userLocation, isLocked]);

  if (!targetLocation) return null;

  return (
    <div className="card border-warning mb-4">
      <div className="card-body">
        {isLocked ? (
          <>
            <div className="d-flex align-items-center mb-3">
              <Lock className="text-warning me-2" size={24} />
              <h5 className="mb-0 text-warning">Location Locked</h5>
            </div>

            <p className="mb-3">
              This question unlocks when you're near{' '}
              <strong>
                {targetLocation.address || `${targetLocation.lat.toFixed(4)}, ${targetLocation.lng.toFixed(4)}`}
              </strong>
            </p>

            {distance !== null && (
              <div className="alert alert-info mb-3">
                <MapPin size={16} className="me-2" style={{ display: 'inline' }} />
                You are <strong>{formatDistance(distance)}</strong> away
                <br />
                <small className="text-muted">
                  You need to be within {targetLocation.radius}m to unlock this question
                </small>
              </div>
            )}

            {/* Map showing target location */}
            <div className="mb-3">
              <div
                ref={mapRef}
                className="border rounded"
                style={{ height: '300px', width: '100%', minHeight: '300px' }}
              />
            </div>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="btn btn-primary"
            >
              <RefreshCw size={16} className="me-2" style={{ display: 'inline' }} />
              {isRefreshing ? 'Checking Location...' : 'Refresh Location'}
            </button>
          </>
        ) : (
          <>
            <div className="d-flex align-items-center mb-3">
              <div
                className="text-success me-2"
                style={{ fontSize: '24px' }}
              >
                ✓
              </div>
              <h5 className="mb-0 text-success">Location Unlocked</h5>
            </div>

            <p className="mb-0">
              You are within range of this question's location!
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LocationStatus;
