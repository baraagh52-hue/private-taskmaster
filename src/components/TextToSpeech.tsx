import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, Volume2, Settings, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

interface TextToSpeechProps {
  text: string;
  autoSpeak?: boolean;
  showControls?: boolean;
  className?: string;
}

export const TextToSpeech: React.FC<TextToSpeechProps> = ({
  text,
  autoSpeak = false,
  showControls = true,
  className = '',
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempRate, setTempRate] = useState<number[]>([1]);
  const [tempPitch, setTempPitch] = useState<number[]>([1]);
  const [tempVolume, setTempVolume] = useState<number[]>([1]);
  const [tempVoice, setTempVoice] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  const {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isLoading,
    voices,
    isSupported,
    voicePreferences,
    saveVoicePreferences,
    preferredVoice,
    coquiStatus,
  } = useTextToSpeech();

  // Initialize temp values when preferences load
  React.useEffect(() => {
    if (voicePreferences) {
      setTempRate([voicePreferences.speechRate]);
      setTempPitch([voicePreferences.speechPitch]);
      setTempVolume([voicePreferences.speechVolume]);
      setTempVoice(voicePreferences.preferredVoice || '');
    }
  }, [voicePreferences]);

  // Auto-speak when text changes (if enabled)
  React.useEffect(() => {
    if (autoSpeak && text && isSupported) {
      speak(text);
    }
  }, [text, autoSpeak, speak, isSupported]);

  const handleSpeak = () => {
    if (isPaused) {
      resume();
    } else {
      speak(text, {
        voice: voices.find(v => v.name === tempVoice) || preferredVoice,
        rate: tempRate[0],
        pitch: tempPitch[0],
        volume: tempVolume[0],
        model: selectedModel || undefined,
      });
    }
  };

  const handleSaveSettings = async () => {
    await saveVoicePreferences({
      preferredVoice: tempVoice,
      speechRate: tempRate[0],
      speechPitch: tempPitch[0],
      speechVolume: tempVolume[0],
    });
    setShowSettings(false);
  };

  if (!isSupported) {
    return (
      <Card className={`border-destructive ${className}`}>
        <CardContent className="pt-6">
          <p className="text-destructive text-sm">
            Your browser does not support text-to-speech functionality.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!showControls) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Volume2 className="h-4 w-4" />
            Text-to-Speech
            {coquiStatus.available && (
              <Badge variant="secondary" className="ml-2">
                <Zap className="h-3 w-3 mr-1" />
                Coqui TTS
              </Badge>
            )}
            {!coquiStatus.available && coquiStatus.configured && (
              <Badge variant="outline" className="ml-2">
                <Globe className="h-3 w-3 mr-1" />
                Browser TTS
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSpeak}
              disabled={!text.trim() || (isSpeaking && !isPaused) || isLoading}
              size="sm"
              variant="default"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isLoading ? 'Loading...' : isPaused ? 'Resume' : 'Speak'}
            </Button>

            {isSpeaking && !isPaused && (
              <Button onClick={pause} size="sm" variant="outline">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}

            {(isSpeaking || isPaused) && (
              <Button onClick={stop} size="sm" variant="outline">
                <Square className="h-4 w-4" />
                Stop
              </Button>
            )}

            <Button
              onClick={() => setShowSettings(!showSettings)}
              size="sm"
              variant="ghost"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Status */}
          {(isSpeaking || isLoading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating speech...
                </>
              ) : isPaused ? (
                'Paused'
              ) : (
                <>
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Speaking...
                </>
              )}
            </motion.div>
          )}

          {/* Coqui Status */}
          {coquiStatus.configured && (
            <div className="text-xs text-muted-foreground">
              Coqui TTS: {coquiStatus.available ? (
                <span className="text-green-500">Available</span>
              ) : (
                <span className="text-yellow-500">Offline (using browser fallback)</span>
              )}
            </div>
          )}

          {/* Settings Panel */}
          <Collapsible open={showSettings} onOpenChange={setShowSettings}>
            <CollapsibleContent className="space-y-4">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 border-t"
              >
                {/* Coqui Model Selection */}
                {coquiStatus.available && coquiStatus.models && coquiStatus.models.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="model-select" className="text-xs">Coqui TTS Model</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger id="model-select" className="h-8">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Default Model</SelectItem>
                        {coquiStatus.models.map((model: any, index: number) => (
                          <SelectItem key={index} value={model.name || model}>
                            {model.name || model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Voice Selection (for browser fallback) */}
                <div className="space-y-2">
                  <Label htmlFor="voice-select" className="text-xs">
                    Browser Voice {!coquiStatus.available && "(Fallback)"}
                  </Label>
                  <Select value={tempVoice} onValueChange={setTempVoice}>
                    <SelectTrigger id="voice-select" className="h-8">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                          {voice.default ? ' - Default' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate Control */}
                <div className="space-y-2">
                  <Label className="text-xs">
                    Speed: {tempRate[0].toFixed(1)}x
                  </Label>
                  <Slider
                    value={tempRate}
                    onValueChange={setTempRate}
                    min={0.1}
                    max={3}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Pitch Control */}
                <div className="space-y-2">
                  <Label className="text-xs">
                    Pitch: {tempPitch[0].toFixed(1)}
                  </Label>
                  <Slider
                    value={tempPitch}
                    onValueChange={setTempPitch}
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Volume Control */}
                <div className="space-y-2">
                  <Label className="text-xs">
                    Volume: {Math.round(tempVolume[0] * 100)}%
                  </Label>
                  <Slider
                    value={tempVolume}
                    onValueChange={setTempVolume}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Save Button */}
                <Button onClick={handleSaveSettings} size="sm" className="w-full">
                  Save Preferences
                </Button>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TextToSpeech;