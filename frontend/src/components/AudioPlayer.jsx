import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Volume2 } from 'lucide-react';

export default function AudioPlayer({ src, label }) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    console.log('AudioPlayer: useEffect RUNNING, src=', src);
    const audio = audioRef.current;
    if (!audio) {
      console.log('AudioPlayer: No audio ref');
      return;
    }

    console.log('AudioPlayer: Setting up audio, src=', src);

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      console.log('AudioPlayer: Time update', audio.currentTime, '/', audio.duration);
    };

    const updateDuration = () => {
      console.log('AudioPlayer: Duration update event, duration=', audio.duration);
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
        console.log('AudioPlayer: Duration set to', audio.duration);
      }
    };

    const handleEnded = () => {
      console.log('AudioPlayer: Playback ended');
      setIsPlaying(false);
    };

    const handleLoadedData = () => {
      console.log('AudioPlayer: Loaded data, duration=', audio.duration);
      updateDuration();
    };

    const handleCanPlay = () => {
      console.log('AudioPlayer: Can play, duration=', audio.duration);
      updateDuration();
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);

    // Only load if not already loaded
    if (audio.readyState === 0) {
      audio.load();
      console.log('AudioPlayer: Called audio.load() because readyState was 0');
    } else {
      console.log('AudioPlayer: Skipped audio.load(), readyState=', audio.readyState);
    }

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skip = (seconds) => {
    console.log('AudioPlayer: Skip called', seconds, 'duration=', duration);
    const audio = audioRef.current;
    if (!audio || isNaN(audio.duration)) {
      console.log('AudioPlayer: Skip failed - no audio or NaN duration');
      return;
    }
    const newTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    console.log('AudioPlayer: Setting currentTime from', audio.currentTime, 'to', newTime);
    audio.currentTime = newTime;
  };

  const replay = () => {
    console.log('AudioPlayer: Replay called');
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
    setIsPlaying(true);
  };

  const handleProgressClick = (e) => {
    console.log('AudioPlayer: Progress bar clicked, duration=', duration);
    const progressBar = progressBarRef.current;
    const audio = audioRef.current;
    if (!progressBar || !audio || isNaN(duration) || duration === 0) {
      console.log('AudioPlayer: Progress click failed - missing refs or zero duration');
      return;
    }

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    console.log('AudioPlayer: Seeking to', newTime, '(', percentage * 100, '%)');
    audio.currentTime = newTime;
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const [showVolume, setShowVolume] = useState(false);

  return (
    <div className="border rounded p-2 bg-light">
      <audio ref={audioRef} src={src} preload="auto" />

      {label && (
        <div className="mb-2 d-flex align-items-center gap-2 small">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <strong>{label}</strong>
        </div>
      )}

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

        {/* Volume Toggle */}
        <button
          onClick={() => setShowVolume(!showVolume)}
          className="btn btn-outline-secondary btn-sm"
          style={{ padding: '4px 6px' }}
          title="Volume"
        >
          <Volume2 size={14} />
        </button>
      </div>

      {/* Volume Slider (hidden by default) */}
      {showVolume && (
        <div className="mt-2 d-flex align-items-center gap-2">
          <Volume2 size={14} className="text-secondary" />
          <input
            type="range"
            className="form-range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
          />
          <span className="small text-muted" style={{ minWidth: '35px' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
