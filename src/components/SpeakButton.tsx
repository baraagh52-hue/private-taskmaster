import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

interface SpeakButtonProps {
  text: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export const SpeakButton: React.FC<SpeakButtonProps> = ({
  text,
  size = 'sm',
  variant = 'ghost',
  className = '',
}) => {
  const { speak, stop, isSpeaking, isSupported } = useTextToSpeech();

  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <Button
      onClick={handleClick}
      size={size}
      variant={variant}
      className={className}
      disabled={!text.trim()}
    >
      {isSpeaking ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
};

export default SpeakButton;
