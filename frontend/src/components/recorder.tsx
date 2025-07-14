import{ useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, Download, Trash2, Send } from 'lucide-react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const {username }= useParams()
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setIsRecording(true);
      setCurrentTime(0);
      
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      
      playbackIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setPlaybackTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const downloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const deleteRecording = () => {
    setAudioURL('');
    setAudioBlob(null);
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setPlaybackTime(0);
    if (audioRef.current) {
      audioRef.current.src = '';
    }
  };

  const sendToDatabase = async () => {
    if (!audioBlob) {
      alert('No recording available to send');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
    formData.append('duration', duration.toString());
    formData.append('timestamp', new Date().toISOString());
    formData.append('username', username ?? '');

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/upload-recording`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      if (response.status === 200) {
        alert('Recording sent successfully!');
      } else {
        throw new Error('Failed to send recording');
      }
    } catch (error) {
      console.error('Error sending recording:', error);
      alert('Error sending recording. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl shadow-2xl border border-gray-700">
      <div className="text-center mb-8">
        <h1 className="text-white text-lg font-light mb-2">
          Sending to <span className="text-blue-400 font-semibold">{username}</span>
        </h1>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Voice Recorder
        </h2>
      </div>
      
      <div className="flex justify-center mb-8">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/25 transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <Mic size={24} className="relative z-10" />
            <span className="relative z-10">Start Recording</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="group relative flex items-center gap-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-gray-500/25 transform hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <MicOff size={24} className="relative z-10" />
            <span className="relative z-10">Stop Recording</span>
          </button>
        )}
      </div>

      {isRecording && (
        <div className="text-center mb-6 p-6 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700">
          <div className="text-4xl font-mono text-red-400 mb-2 font-light">
            {formatTime(currentTime)}
          </div>
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-300">Recording in progress...</span>
          </div>
        </div>
      )}

      {audioURL && (
        <div className="border-t border-gray-700 pt-6">
          <audio
            ref={audioRef}
            src={audioURL}
            onEnded={handleAudioEnded}
            onLoadedMetadata={handleLoadedMetadata}
            className="hidden"
          />
          
          <div className="flex items-center justify-center gap-6 mb-6 p-4 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700">
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              {isPlaying ? <Pause size={20} className="relative z-10" /> : <Play size={20} className="relative z-10" />}
              <span className="relative z-10">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            
            <div className="text-center">
              <div className="text-white font-mono text-lg">
                {formatTime(playbackTime)} / {formatTime(duration)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Duration</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${duration > 0 ? (playbackTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={sendToDatabase}
              className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-green-500/25 transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Send size={16} className="relative z-10" />
              <span className="relative z-10 text-sm">Send</span>
            </button>
            
            <button
              onClick={downloadAudio}
              className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-indigo-500/25 transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Download size={16} className="relative z-10" />
              <span className="relative z-10 text-sm">Download</span>
            </button>
            
            <button
              onClick={deleteRecording}
              className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/25 transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              <Trash2 size={16} className="relative z-10" />
              <span className="relative z-10 text-sm">Delete</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 text-center p-4 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700">
        <p className="text-gray-300 text-sm mb-1">Click "Start Recording" to begin capturing audio.</p>
        <p className="text-gray-400 text-xs">The recording will be saved as a WebM file.</p>
      </div>
    </div>
  );
};

export default VoiceRecorder;