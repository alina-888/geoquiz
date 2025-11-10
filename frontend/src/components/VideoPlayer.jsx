import React from 'react';

export default function VideoPlayer({ src }) {
  return (
    <div className="border rounded p-3 bg-light">
      <video
        controls
        preload="auto"
        className="w-100 rounded"
        style={{ maxHeight: '500px', backgroundColor: '#000' }}
      >
        <source src={src} />
        Your browser does not support the video element.
      </video>
    </div>
  );
}
