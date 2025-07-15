import React, { useEffect, useState, useRef } from "react";
import { Play, Pause, Download, Clock, User, Headphones, X, SkipBack, SkipForward } from "lucide-react";
import { useAuth } from "../context/auth";
import axios from "axios";

interface Recording {
  audio: string;
  created_at: string;
}

const Home = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const fetchRecordings = async () => {
    console.log(user)
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/recordings/`,
        { withCredentials: true }
      );
      setRecordings(response.data.recordings || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
    return () => {};
  }, []);
  
  const url = `https://www.anonymousrecording.com/${user?.username}`

  const formatDateTime = (dateTimeString: string) => {
    try {
      const date = new Date(dateTimeString);
      return {
        date: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
      };
    } catch {
      return { date: 'Invalid Date', time: 'Invalid Time' };
    }
  };

  const formatTime = (time: number) => {
    if (!time || !isFinite(time) || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const playAudio = (audioData: string, index: number) => {
    let updateProgress: () => void;
    let updateDuration: () => void;
    let handleAudioEnd: () => void;

    try {
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = new Audio(audioUrl);

      updateProgress = () => {
        setCurrentTime(audio.currentTime);
        setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
      };
      
      updateDuration = () => {
        setDuration(audio.duration);
      };
      
      handleAudioEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setProgress(0);
        URL.revokeObjectURL(audioUrl);
      };

      if (currentAudio) {
        currentAudio.pause();
        currentAudio.removeEventListener('timeupdate', updateProgress);
        currentAudio.removeEventListener('loadedmetadata', updateDuration);
        currentAudio.removeEventListener('ended', handleAudioEnd);
      }
      
      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', handleAudioEnd);
      
      setCurrentAudio(audio);
      setPlayingIndex(index);
      setShowModal(true);
      setIsPlaying(true);
      
      audio.play();
      
      audio.onerror = () => {
        setIsPlaying(false);
        setPlayingIndex(null);
        URL.revokeObjectURL(audioUrl);
        alert('Error playing audio');
      };
    } catch (err) {
      console.error('Error playing audio:', err);
      alert('Error playing audio');
    }
  };

  const togglePlayPause = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
        setIsPlaying(false);
      } else {
        currentAudio.play();
        setIsPlaying(true);
      }
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      alert("Text copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy text: ", err);
    });
  };

  const playNext = () => {
    if (playingIndex !== null && playingIndex < recordings.length - 1) {
      const nextIndex = playingIndex + 1;
      playAudio(recordings[nextIndex].audio, nextIndex);
    }
  };

  const playPrevious = () => {
    if (playingIndex !== null && playingIndex > 0) {
      const prevIndex = playingIndex - 1;
      playAudio(recordings[prevIndex].audio, prevIndex);
    }
  };

  const closeModal = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.removeEventListener('timeupdate', () => {});
      currentAudio.removeEventListener('loadedmetadata', () => {});
      currentAudio.removeEventListener('ended', () => {});
    }
    setShowModal(false);
    setIsPlaying(false);
    setPlayingIndex(null);
    setCurrentTime(0);
    setDuration(0);
    setProgress(0);
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    if (progressRef.current && currentAudio && duration) {
      const rect = progressRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      currentAudio.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress((newTime / duration) * 100);
    }
  };

  const downloadAudio = (audioData: string, dateTime: string) => {
    try {
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `recording-${dateTime.replace(/[^a-zA-Z0-9]/g, '-')}.webm`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading audio:', err);
      alert('Error downloading audio');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-white/20 to-gray-300/20 rounded-full backdrop-blur-sm border border-white/10">
                <Headphones size={20} className="text-white sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Audio Recordings
                </h1>
                <p className="text-gray-400 flex items-center gap-2 mt-1 text-sm sm:text-base">
                  <User size={14} className="sm:w-4 sm:h-4" />
                  Welcome, <span className="text-white font-semibold">{user?.username}</span>
                </p>
              </div>
            </div>
            
            {/* URL Section - Mobile Responsive */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-3 sm:p-4">
              <p className="text-gray-400 text-xs sm:text-sm mb-2">Your Link</p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
                <p className="text-white text-xs sm:text-sm font-mono break-all sm:break-normal flex-1">
                  {url}
                </p>
                <button 
                  className="w-full sm:w-auto bg-white text-black font-semibold py-2 px-3 sm:py-2 sm:px-4 rounded-lg transition-all duration-200 hover:bg-gray-100 active:scale-95 text-sm"
                  onClick={handleCopy}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Status Bar */}
        <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${loading ? 'bg-gray-400 animate-pulse' : 'bg-white'}`}></div>
              <span className="text-gray-300 text-sm sm:text-base">
                {loading ? 'Loading recordings...' : `${recordings.length} recordings found`}
              </span>
            </div>
            <button
              onClick={fetchRecordings}
              disabled={loading}
              className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm transition-all duration-200 backdrop-blur-sm border border-white/10"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-red-900/20 backdrop-blur-sm rounded-xl border border-red-500/20">
            <p className="text-red-400 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 sm:p-6 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-white/20 rounded w-24 sm:w-32"></div>
                    <div className="h-3 bg-white/20 rounded w-16 sm:w-24"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full"></div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : recordings.length === 0 ? (
          /* No Recordings State */
          <div className="text-center py-8 sm:py-12">
            <div className="p-4 sm:p-6 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10">
              <Headphones size={40} className="text-gray-500 mx-auto mb-4 sm:w-12 sm:h-12" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-300 mb-2">No recordings yet</h3>
            </div>
          </div>
        ) : (
          /* Recordings List */
          <div className="space-y-3 sm:space-y-4">
            {recordings.map((recording, index) => {
              const { date, time } = formatDateTime(recording.created_at);
              
              return (
                <div key={index} className="group p-4 sm:p-6 bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-3 bg-gradient-to-r from-white/20 to-gray-300/20 rounded-full backdrop-blur-sm border border-white/10 shrink-0">
                        <Headphones size={16} className="text-white sm:w-5 sm:h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                          Recording #{recordings.length - index}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="sm:w-3.5 sm:h-3.5" />
                            <span>{time}</span>
                          </div>
                          <span className="hidden sm:inline">•</span>
                          <span>{date}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => playAudio(recording.audio, index)}
                        className="group/btn relative flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-white/10 transform hover:scale-105 backdrop-blur-sm border border-white/10 text-sm sm:text-base"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <Play size={14} className="relative z-10 sm:w-4 sm:h-4" />
                        <span className="relative z-10">Play</span>
                      </button>
                      
                      <button
                        onClick={() => downloadAudio(recording.audio, recording.created_at)}
                        className="group/btn relative p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-white/10 transform hover:scale-105 backdrop-blur-sm border border-white/10"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                        <Download size={14} className="relative z-10 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal - Mobile Responsive */}
      {showModal && playingIndex !== null && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl relative mx-4">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/10"
            >
              <X size={18} className="text-white sm:w-5 sm:h-5" />
            </button>

            <div className="text-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gradient-to-r from-white/20 to-gray-300/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                <Headphones size={24} className="text-white sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Recording #{recordings.length - playingIndex}
              </h3>
              <p className="text-gray-400 text-xs sm:text-sm">
                {formatDateTime(recordings[playingIndex].created_at).date} • {formatDateTime(recordings[playingIndex].created_at).time}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 sm:mb-6">
              <div 
                ref={progressRef}
                onClick={handleProgressClick}
                className="h-2 bg-white/20 rounded-full cursor-pointer group relative overflow-hidden"
              >
                <div 
                  className="h-full bg-gradient-to-r from-white to-gray-300 rounded-full transition-all duration-300 group-hover:from-white/80 group-hover:to-gray-300/80"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <button 
                onClick={playPrevious}
                disabled={playingIndex === 0}
                className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all duration-200 backdrop-blur-sm border border-white/10"
              >
                <SkipBack size={16} className="text-white sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="p-3 sm:p-4 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/10 transform hover:scale-105"
              >
                {isPlaying ? (
                  <Pause size={20} className="text-white sm:w-6 sm:h-6" />
                ) : (
                  <Play size={20} className="text-white sm:w-6 sm:h-6" />
                )}
              </button>
              
              <button 
                onClick={playNext}
                disabled={playingIndex === recordings.length - 1}
                className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition-all duration-200 backdrop-blur-sm border border-white/10"
              >
                <SkipForward size={16} className="text-white sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;