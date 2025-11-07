/**
 * Geolocation utilities for location-based question unlocking
 */

/**
 * Check if DEBUG mode is enabled (bypasses all location checks)
 * Can be toggled via localStorage or environment variable
 */
export const isDebugMode = () => {
  return localStorage.getItem('DEBUG_SKIP_GEOLOCATION') === 'true' ||
         process.env.REACT_APP_DEBUG_GEOLOCATION === 'true';
};

/**
 * Toggle DEBUG mode on/off
 * Reloads the page to apply changes
 */
export const toggleDebugMode = () => {
  const current = isDebugMode();
  localStorage.setItem('DEBUG_SKIP_GEOLOCATION', String(!current));
  window.location.reload();
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Get user's current position
 * @param {Object} options - Geolocation options
 * @returns {Promise<{lat: number, lng: number, accuracy: number}>}
 */
export const getCurrentPosition = (options = {}) => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Unable to get your location';

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
            errorMessage = error.message || 'Unknown error getting location';
        }

        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
};

/**
 * Check if user is within radius of target location
 * @param {Object} userLocation - User's current location {lat, lng}
 * @param {Object} targetLocation - Target location {lat, lng, radius}
 * @returns {boolean} True if user is within radius
 */
export const isWithinRadius = (userLocation, targetLocation) => {
  if (!userLocation || !targetLocation) return false;

  const distance = calculateDistance(
    userLocation.lat,
    userLocation.lng,
    targetLocation.lat,
    targetLocation.lng
  );

  return distance <= targetLocation.radius;
};

/**
 * Format distance for display
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance (e.g., "247m" or "1.2km")
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

/**
 * Watch user's position continuously
 * @param {Function} onSuccess - Callback for position updates
 * @param {Function} onError - Callback for errors
 * @param {Object} options - Geolocation options
 * @returns {number} Watch ID (use to clear with clearWatch)
 */
export const watchPosition = (onSuccess, onError, options = {}) => {
  if (!('geolocation' in navigator)) {
    onError(new Error('Geolocation is not supported by your browser'));
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
    ...options
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    },
    (error) => {
      let errorMessage = 'Unable to watch location';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
        default:
          errorMessage = error.message || 'Unknown error';
      }

      onError(new Error(errorMessage));
    },
    defaultOptions
  );
};

/**
 * Clear position watch
 * @param {number} watchId - Watch ID from watchPosition
 */
export const clearPositionWatch = (watchId) => {
  if (watchId && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
};
