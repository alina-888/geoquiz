import React from 'react';

export default function AudioPlayer({ src, label }) {
  return (
    <div className="border rounded p-3 bg-light">
      {label && (
        <div className="mb-2 d-flex align-items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <strong>{label}</strong>
        </div>
      )}
      <audio
        controls
        preload="auto"
        className="w-100"
        style={{ height: '40px' }}
      >
        <source src={src} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
