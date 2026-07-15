import React, { useState, useEffect } from 'react';

interface CountdownTimerProps {
  initialSeconds?: number;
  text?: string;
  fallbackText?: string;
}

export function CountdownTimer({ 
  initialSeconds = 10, 
  text = "Gemini is analyzing... (results usually appear within {s} seconds)",
  fallbackText = "Gemini is still analyzing... please wait"
}: CountdownTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    
    const timer = setInterval(() => {
      setSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [seconds]);

  if (seconds === 0) {
    return <span>{fallbackText}</span>;
  }

  return (
    <span>{text.replace('{s}', seconds.toString())}</span>
  );
}
