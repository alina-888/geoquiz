import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Volume2, Maximize } from 'lucide-react';

export default function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('durationchange', updateDuration);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('durationchange', updateDuration);
      video.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video || isNaN(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
    setIsPlaying(true);
  };

  const handleProgressClick = (e) => {
    const progressBar = progressBarRef.current;
    const video = videoRef.current;
    if (!progressBar || !video || isNaN(duration) || duration === 0) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    video.currentTime = newTime;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
  };

  const handleSpeedChange = (speed) => {
    setPlaybackRate(speed);
    videoRef.current.playbackRate = speed;
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
      video.msRequestFullscreen();
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const [showSpeed, setShowSpeed] = useState(false);

  return (
    <div className="border rounded p-2 bg-light">
      <div className="position-relative mb-2">
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          className="w-100 rounded"
          style={{ maxHeight: '400px', backgroundColor: '#000' }}
          onClick={togglePlay}
        />
      </div>

      {/* Compact Controls Row */}
      <div className="d-flex align-items-center gap-2">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="btn btn-primary btn-sm"
          style={{ minWidth: '36px', padding: '4px 8px' }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        {/* Skip Back */}
        <button
          onClick={() => skip(-10)}
          className="btn btn-outline-secondary btn-sm"
          style={{ padding: '4px 6px' }}
          title="Skip back 10s"
        >
          <SkipBack size={14} />
        </button>

        {/* Skip Forward */}
        <button
          onClick={() => skip(10)}
          className="btn btn-outline-secondary btn-sm"
          style={{ padding: '4px 6px' }}
          title="Skip forward 10s"
        >
          <SkipForward size={14} />
        </button>

        {/* Replay */}
        <button
          onClick={replay}
          className="btn btn-outline-secondary btn-sm"
          style={{ padding: '4px 6px' }}
          title="Replay"
        >
          <RotateCcw size={14} />
        </button>

        {/* Progress Bar + Time */}
        <div className="flex-grow-1 d-flex align-items-center gap-2">
          <span className="small text-muted" style={{ minWidth: '40px', fontSize: '0.75rem' }}>
            {formatTime(currentTime)}
          </span>
          <div
            ref={progressBarRef}
            className="progress flex-grow-1"
            style={{ height: '6px', cursor: 'pointer' }}
            onClick={handleProgressClick}
          >
            <div
              className="progress-bar bg-primary"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <span className="small text-muted" style={{ minWidth: '40px', fontSize: '0.75rem' }}>
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Slider */}
        <div className="d-flex align-items-center gap-1" style={{ width: '100px' }}>
          <Volume2 size={14} className="text-secondary" />
          <input
            type="range"
            className="form-range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            style={{ width: '70px' }}
          />
        </div>

        {/* Speed Toggle */}
        <button
          onClick={() => setShowSpeed(!showSpeed)}
          className={`btn btn-sm ${showSpeed ? 'btn-secondary' : 'btn-outline-secondary'}`}
          style={{ padding: '4px 8px', minWidth: '45px' }}
          title="Playback speed"
        >
          {playbackRate}x
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="btn btn-outline-secondary btn-sm"
          style={{ padding: '4px 6px' }}
          title="Fullscreen"
        >
          <Maximize size={14} />
        </button>
      </div>

      {/* Speed Controls (hidden by default) */}
      {showSpeed && (
        <div className="mt-2 d-flex justify-content-center gap-2">
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
            <button
              key={speed}
              type="button"
              className={`btn btn-sm ${playbackRate === speed ? 'btn-secondary' : 'btn-outline-secondary'}`}
              onClick={() => {
                handleSpeedChange(speed);
                setShowSpeed(false);
              }}
              style={{ padding: '4px 8px' }}
            >
              {speed}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
