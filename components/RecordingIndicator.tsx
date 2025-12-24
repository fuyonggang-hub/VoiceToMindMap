
import React from 'react';

interface Props {
  duration: number;
}

export const RecordingIndicator: React.FC<Props> = ({ duration }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center pulse-animation">
        <div className="w-4 h-4 bg-white rounded-sm"></div>
      </div>
      <div className="text-2xl font-mono font-medium text-red-500">
        {formatTime(duration)}
      </div>
      <p className="text-slate-500 animate-pulse">Recording... tap to stop</p>
    </div>
  );
};
