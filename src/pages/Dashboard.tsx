import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  Timer, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  Plus,
  Settings,
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Coffee,
  Moon,
  Sun,
  Calendar,
  ListTodo,
  Check,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

// Voice interaction hook
function useVoiceInteraction() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        setRecognition(recognitionInstance);
      }

      // Initialize Speech Synthesis
      if (window.speechSynthesis) {
        setSynthesis(window.speechSynthesis);
      }
    }
  }, []);

  const startListening = (onResult: (transcript: string) => void) => {
    if (!recognition) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Speech recognition error");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
  };

  const speak = (text: string) => {
    if (!synthesis) {
      toast.error("Speech synthesis not supported in this browser");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesis) {
      synthesis.cancel();
    }
    setIsSpeaking(false);
  };

  return {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionTasks, setNewSessionTasks] = useState("");
  const [plannedDuration, setPlannedDuration] = useState(60);
  const [showNewSession, setShowNewSession] = useState(false);
  const [checkinInput, setCheckinInput] = useState("");

  // Detect speech recognition support (type-safe, no TS directives)
  const sttSupported =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Init voiceEnabled based on STT availability (was true by default)
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);

  // Ensure initial state follows actual capability, and notify once if unavailable
  useEffect(() => {
    if (sttSupported) {
      setVoiceEnabled(true);
    } else {
      setVoiceEnabled(false);
      toast("Speech-to-Text is not available on this browser/OS", {
        description:
          "Use the manual input for check-ins, or try Chrome/Chromium. Some Linux builds lack the Web Speech API.",
      });
    }
  }, [sttSupported]);

  // Voice interaction
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useVoiceInteraction();

  // Convex queries and mutations
  const currentSession = useQuery(api.sessions.getCurrentSession);
  const sessionStats = useQuery(api.sessions.getSessionStats);
  const recentSessions = useQuery(api.sessions.getUserSessions, { limit: 5 });
  const sessionCheckins = useQuery(api.checkins.getSessionCheckins, 
    currentSession ? { sessionId: currentSession._id } : "skip"
  );

  // Prayer-related queries
  const prayerPreferences = useQuery(api.prayers.getPrayerPreferences);
  const todaysPrayerStatus = useQuery(api.prayers.getTodaysPrayerStatus);
  const prayerStats = useQuery(api.prayers.getPrayerStats, { days: 7 });

  const createSession = useMutation(api.sessions.createSession);
  const updateSessionStatus = useMutation(api.sessions.updateSessionStatus);
  const createCheckin = useMutation(api.checkins.createCheckin);
  const recordPrayerCheckin = useMutation(api.prayers.recordPrayerCheckin);
  const chatWithAI = useAction(api.ai.chatWithPhi3);

  // Timer for current session
  const [sessionTime, setSessionTime] = useState(0);
  const [lastCheckinTime, setLastCheckinTime] = useState(0);

  // Add next prayer countdown state
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; targetTs: number; isTomorrow: boolean } | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // Helpers for time calculations
  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const dateWithTime = (base: Date, t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Compute the next prayer (today if any upcoming pending; otherwise tomorrow's first enabled)
  useEffect(() => {
    if (!prayerPreferences || !todaysPrayerStatus) return;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const todaysEnabledSorted =
      [...todaysPrayerStatus]
        .filter((p: any) => p.enabled)
        .sort((a: any, b: any) => a.time.localeCompare(b.time));

    let upcoming: any = todaysEnabledSorted.find((p: any) => p.status === "pending" && timeToMinutes(p.time) > currentMins);
    let targetTs: number;
    let isTomorrow = false;

    if (upcoming) {
      targetTs = dateWithTime(now, upcoming.time).getTime();
    } else {
      const prefsSorted =
        [...(prayerPreferences.prayerTimes || [])]
          .filter((p: any) => p.enabled)
          .sort((a: any, b: any) => a.time.localeCompare(b.time));
      const firstTomorrow = prefsSorted[0] || { name: "Fajr", time: "05:30" };
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      targetTs = dateWithTime(tomorrow, firstTomorrow.time).getTime();
      upcoming = { name: firstTomorrow.name, time: firstTomorrow.time };
      isTomorrow = true;
    }

    setNextPrayer({ name: upcoming.name, time: upcoming.time, targetTs, isTomorrow });
  }, [prayerPreferences, todaysPrayerStatus]);

  // Update the live countdown
  useEffect(() => {
    if (!nextPrayer) return;

    const update = () => {
      const msLeft = nextPrayer.targetTs - Date.now();
      if (msLeft <= 0) {
        setCountdown("Now");
        return;
      }
      const totalSec = Math.floor(msLeft / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      setCountdown(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [nextPrayer]);

  // Sorted prayers for display
  const sortedTodaysPrayers = todaysPrayerStatus
    ? [...todaysPrayerStatus].sort((a: any, b: any) => a.time.localeCompare(b.time))
    : null;

  useEffect(() => {
    if (currentSession?.status === "active") {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - currentSession.startTime) / 1000 / 60);
        setSessionTime(elapsed);
        
        const timeSinceLastCheckin = sessionCheckins && sessionCheckins.length > 0
          ? Math.floor((Date.now() - sessionCheckins[0].timestamp) / 1000 / 60)
          : elapsed;
        setLastCheckinTime(timeSinceLastCheckin);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentSession, sessionCheckins]);

  // Prayer time reminders
  useEffect(() => {
    if (prayerPreferences?.prayerRemindersEnabled && todaysPrayerStatus) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const upcomingPrayer = todaysPrayerStatus.find((prayer: any) => 
        prayer.enabled && prayer.status === "pending" && prayer.time > currentTime
      );
      
      if (upcomingPrayer) {
        const prayerTime = new Date();
        const [hours, minutes] = upcomingPrayer.time.split(':');
        prayerTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        const timeUntilPrayer = prayerTime.getTime() - now.getTime();
        
        // Remind 5 minutes before prayer time
        if (timeUntilPrayer > 0 && timeUntilPrayer <= 5 * 60 * 1000) {
          toast(`🕌 ${upcomingPrayer.name} prayer time in 5 minutes`, {
            description: `Scheduled for ${upcomingPrayer.time}`,
            action: {
              label: "Mark as Done",
              onClick: () => handlePrayerCheckin(upcomingPrayer.name, upcomingPrayer.time, "completed")
            }
          });
        }
      }
    }
  }, [prayerPreferences, todaysPrayerStatus]);

  // Auto check-in reminder
  useEffect(() => {
    const checkinFrequency = 25; // default to 25 minutes
    if (currentSession?.status === "active" && lastCheckinTime >= checkinFrequency) {
      toast("Time for a check-in!", {
        description: "How are you progressing on your tasks?",
        action: {
          label: "Check In",
          onClick: () => handleQuickCheckin()
        }
      });
    }
  }, [lastCheckinTime, currentSession, user]);

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim()) {
      toast.error("Please enter a session title");
      return;
    }

    try {
      const tasks = newSessionTasks.split('\n').filter(task => task.trim());
      await createSession({
        title: newSessionTitle,
        tasks,
        plannedDuration
      });

      setNewSessionTitle("");
      setNewSessionTasks("");
      setShowNewSession(false);
      toast.success("Session started! Stay focused 🎯");
    } catch (error) {
      toast.error("Failed to create session");
    }
  };

  const handleEndSession = async () => {
    if (!currentSession) return;

    try {
      await updateSessionStatus({
        sessionId: currentSession._id,
        status: "completed",
        productivity: 8 // Could be user input
      });
      toast.success("Session completed! Great work 🎉");
    } catch (error) {
      toast.error("Failed to end session");
    }
  };

  const handleQuickCheckin = async () => {
    if (!currentSession) return;

    // Add: guard for STT capability and guide user
    if (voiceEnabled && !sttSupported) {
      setVoiceEnabled(false);
      toast("Voice check-in unavailable", {
        description: "Your browser doesn't support speech recognition. Use manual input instead.",
      });
      setCheckinInput("How are you feeling about your progress?");
      return;
    }

    const prompts = [
      "How are you feeling about your progress?",
      "What's your current focus level from 1-10?",
      "Are you staying on track with your tasks?",
      "Any distractions you're dealing with right now?",
      "Need me to add any tasks to your to-do list?"
    ];

    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    if (voiceEnabled) {
      speak(randomPrompt);
      setTimeout(() => {
        startListening(async (transcript) => {
          await handleCheckinResponse(transcript, randomPrompt);
        });
      }, 2000);
    } else {
      setCheckinInput(randomPrompt);
    }
  };

  const handleCheckinResponse = async (response: string, prompt?: string) => {
    if (!currentSession || !response.trim()) return;

    try {
      // Determine response type based on keywords (mapped to schema values)
      let responseType: "progress" | "stuck" | "done" | "other" = "progress";
      const lowerResponse = response.toLowerCase();

      if (lowerResponse.includes("done") || lowerResponse.includes("finished") || lowerResponse.includes("completed")) {
        responseType = "done";
      } else if (lowerResponse.includes("distracted") || lowerResponse.includes("unfocused")) {
        responseType = "stuck";
      } else if (lowerResponse.includes("procrastinat") || lowerResponse.includes("avoiding")) {
        responseType = "stuck";
      } else if (lowerResponse.includes("break") || lowerResponse.includes("rest")) {
        responseType = "other";
      }

      // Get AI response
      const aiResult = await chatWithAI({
        prompt: response,
        sessionId: currentSession._id,
        context: `Session: ${currentSession.title}, Tasks: ${currentSession.tasks.join(", ")}`
      });

      // Create check-in record
      await createCheckin({
        sessionId: currentSession._id,
        response: responseType,
        description: response,
        aiPrompt: prompt,
        aiResponse: aiResult.response,
        voiceInput: voiceEnabled,
        voiceOutput: voiceEnabled
      });

      // Speak AI response if voice enabled
      if (voiceEnabled && aiResult.response) {
        speak(aiResult.response);
      }

      // Show task creation confirmation if task was created
      if (aiResult.taskCreated) {
        toast.success(`✅ Task "${aiResult.taskTitle}" added to Microsoft To-Do!`);
      }

      toast.success("Check-in recorded!");
      setCheckinInput("");
    } catch (error) {
      toast.error("Failed to process check-in");
    }
  };

  const handlePrayerCheckin = async (prayerName: string, scheduledTime: string, status: "completed" | "missed") => {
    try {
      await recordPrayerCheckin({
        prayerName,
        scheduledTime,
        status,
      });
      
      if (status === "completed") {
        toast.success(`🤲 ${prayerName} prayer recorded! Barakallahu feeki`);
      } else {
        toast(`${prayerName} prayer marked as missed. Allah is Most Forgiving 💚`);
      }
    } catch (error) {
      toast.error("Failed to record prayer");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-16 h-16 text-[#00ff88] mx-auto mb-4" />
          <p className="text-white text-xl">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#00ff88] to-[#0088ff] rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Accountability</h1>
              <p className="text-gray-400">Welcome back, {user.name || "User"}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={voiceEnabled ? "border-[#00ff88] text-[#00ff88]" : "border-gray-600"}
              disabled={!sttSupported}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Prayer Reminders Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="bg-gradient-to-r from-[#ff0080]/10 to-[#00ff88]/10 border-[#ff0080]/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Moon className="w-5 h-5 mr-2 text-[#ff0080]" />
                Today's Prayers
                {prayerStats && (
                  <Badge className="ml-2 bg-[#00ff88] text-black">
                    {prayerStats.streak} day streak
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Next Prayer Countdown Box */}
              {nextPrayer && (
                <div className="mb-4 p-4 rounded-lg border bg-black/30 border-[#00ff88]/40 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Next Prayer</div>
                    <div className="text-lg font-semibold text-white">
                      {nextPrayer.name}{" "}
                      <span className="text-gray-400">
                        at {nextPrayer.time}{nextPrayer.isTomorrow ? " (tomorrow)" : ""}
                      </span>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${countdown === "Now" ? "text-[#ff0080]" : "text-[#00ff88]"}`}>
                    {countdown}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-5 gap-2">
                {(sortedTodaysPrayers || []).map((prayer: any) => (
                  <div
                    key={prayer.name}
                    className={`p-3 rounded-lg border text-center ${
                      prayer.status === "completed"
                        ? "bg-[#00ff88]/20 border-[#00ff88]/50"
                        : prayer.status === "missed"
                        ? "bg-[#ff0080]/20 border-[#ff0080]/50"
                        : "bg-black/20 border-gray-700"
                    }`}
                  >
                    <div className="text-sm font-medium text-white">{prayer.name}</div>
                    <div className="text-xs text-gray-400 mb-2">{prayer.time}</div>
                    <div className="flex justify-center space-x-1">
                      {prayer.status === "pending" && prayer.enabled && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrayerCheckin(prayer.name, prayer.time, "completed")}
                            className="h-6 w-6 p-0 border-[#00ff88] text-[#00ff88]"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrayerCheckin(prayer.name, prayer.time, "missed")}
                            className="h-6 w-6 p-0 border-[#ff0080] text-[#ff0080]"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {prayer.status === "completed" && (
                        <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                      )}
                      {prayer.status === "missed" && (
                        <X className="w-4 h-4 text-[#ff0080]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {prayerStats && (
                <div className="mt-4 text-center">
                  <Progress value={prayerStats.completionRate} className="h-2 mb-2" />
                  <p className="text-sm text-gray-400">
                    {prayerStats.completedPrayers}/{prayerStats.totalPrayers} prayers this week ({prayerStats.completionRate}%)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Session */}
        {currentSession ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-[#00ff88]/10 to-[#0088ff]/10 border-[#00ff88]/30">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl text-white flex items-center">
                      <Timer className="w-6 h-6 mr-2 text-[#00ff88]" />
                      {currentSession.title}
                    </CardTitle>
                    <p className="text-gray-300 mt-2">
                      {sessionTime} min / {currentSession.plannedDuration} min planned
                    </p>
                  </div>
                  <Badge 
                    className={`${
                      currentSession.status === "active" 
                        ? "bg-[#00ff88] text-black" 
                        : "bg-gray-600"
                    }`}
                  >
                    {currentSession.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress 
                    value={(sessionTime / currentSession.plannedDuration) * 100} 
                    className="h-2"
                  />
                  
                  {currentSession.tasks.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-white">Tasks:</h4>
                      <ul className="space-y-1">
                        {currentSession.tasks.map((task: string, index: number) => (
                          <li key={index} className="flex items-center text-gray-300">
                            <Target className="w-4 h-4 mr-2 text-[#0088ff]" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <Button
                      onClick={handleQuickCheckin}
                      className="bg-[#ff0080] hover:bg-[#ff0080]/90 text-white"
                      disabled={isListening || isSpeaking}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2 animate-pulse" />
                          Listening...
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Quick Check-in
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={handleEndSession}
                      className="border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88] hover:text-black"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      End Session
                    </Button>

                    {isSpeaking && (
                      <Button
                        variant="outline"
                        onClick={stopSpeaking}
                        className="border-[#ff0080] text-[#ff0080]"
                      >
                        <VolumeX className="w-4 h-4 mr-2" />
                        Stop Speaking
                      </Button>
                    )}
                  </div>

                  {/* Manual check-in input */}
                  {!voiceEnabled && (
                    <div className="space-y-2">
                      <Input
                        placeholder="How are you progressing? Type your check-in... (Try: 'add task to review documents')"
                        value={checkinInput}
                        onChange={(e) => setCheckinInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleCheckinResponse(checkinInput);
                          }
                        }}
                        className="bg-black/40 border-gray-700"
                      />
                      <p className="text-xs text-gray-500">
                        💡 Try saying: "add task to review documents" or "remind me to call mom"
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* New Session Form */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-black/40 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Play className="w-6 h-6 mr-2 text-[#00ff88]" />
                  Start New Session
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!showNewSession ? (
                  <Button
                    onClick={() => setShowNewSession(true)}
                    className="bg-gradient-to-r from-[#00ff88] to-[#0088ff] text-black hover:from-[#00ff88]/90 hover:to-[#0088ff]/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Session
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Input
                      placeholder="Session title (e.g., 'Morning Deep Work')"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      className="bg-black/40 border-gray-700"
                    />
                    
                    <Textarea
                      placeholder="List your tasks (one per line)&#10;- Review project proposal&#10;- Write documentation&#10;- Code new feature"
                      value={newSessionTasks}
                      onChange={(e) => setNewSessionTasks(e.target.value)}
                      rows={4}
                      className="bg-black/40 border-gray-700"
                    />
                    
                    <div className="flex items-center space-x-4">
                      <label className="text-white">Duration:</label>
                      <Input
                        type="number"
                        value={plannedDuration}
                        onChange={(e) => setPlannedDuration(Number(e.target.value))}
                        className="w-20 bg-black/40 border-gray-700"
                      />
                      <span className="text-gray-400">minutes</span>
                    </div>

                    <div className="flex space-x-4">
                      <Button
                        onClick={handleCreateSession}
                        className="bg-[#00ff88] text-black hover:bg-[#00ff88]/90"
                      >
                        Start Session
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowNewSession(false)}
                        className="border-gray-600"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats and Recent Activity */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Session Stats */}
          {sessionStats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-black/40 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-[#0088ff]" />
                    Your Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Sessions</span>
                    <span className="text-white font-semibold">{sessionStats.totalSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Completed</span>
                    <span className="text-[#00ff88] font-semibold">{sessionStats.completedSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Time</span>
                    <span className="text-white font-semibold">{sessionStats.totalMinutes}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Productivity</span>
                    <span className="text-[#ff0080] font-semibold">{sessionStats.avgProductivity}/10</span>
                  </div>
                  {prayerStats && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Prayer Streak</span>
                      <span className="text-[#ff0080] font-semibold">{prayerStats.streak} days</span>
                    </div>
                  )}
                  <Progress value={sessionStats.completionRate} className="h-2" />
                  <p className="text-sm text-gray-400 text-center">
                    {sessionStats.completionRate}% completion rate
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Sessions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="bg-black/40 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-[#00ff88]" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentSessions && recentSessions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSessions.map((session: any) => (
                      <div
                        key={session._id}
                        className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center space-x-3">
                          {session.status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-[#00ff88]" />
                          ) : session.status === "active" ? (
                            <Timer className="w-5 h-5 text-[#0088ff] animate-pulse" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-[#ff0080]" />
                          )}
                          <div>
                            <p className="text-white font-medium">{session.title}</p>
                            <p className="text-gray-400 text-sm">
                              {session.actualDuration || 0}m • {new Date(session.startTime).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${
                            session.status === "completed"
                              ? "bg-[#00ff88] text-black"
                              : session.status === "active"
                              ? "bg-[#0088ff] text-white"
                              : "bg-gray-600 text-white"
                          }`}
                        >
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Coffee className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No sessions yet. Start your first one!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Check-ins */}
        {sessionCheckins && sessionCheckins.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <Card className="bg-black/40 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-[#ff0080]" />
                  Session Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionCheckins.slice(0, 3).map((checkin: any) => (
                    <div
                      key={checkin._id}
                      className="p-4 bg-black/20 rounded-lg border border-gray-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Badge
                          className={`${
                            checkin.response === "progress"
                              ? "bg-[#00ff88] text-black"
                              : checkin.response === "stuck"
                              ? "bg-[#ff0080] text-white"
                              : checkin.response === "done"
                              ? "bg-[#0088ff] text-white"
                              : "bg-gray-600 text-white"
                          }`}
                        >
                          {checkin.response}
                        </Badge>
                        <span className="text-gray-400 text-sm">
                          {new Date(checkin.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {checkin.description && (
                        <p className="text-gray-300 mb-2">{checkin.description}</p>
                      )}
                      {checkin.aiResponse && (
                        <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded p-3">
                          <p className="text-[#00ff88] text-sm font-medium mb-1">AI Coach:</p>
                          <p className="text-white">{checkin.aiResponse}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Add: STT capability banner */}
      {!sttSupported && (
        <div className="mb-6 p-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-sm text-yellow-300">
          Speech-to-Text is unavailable on this browser/OS. Use manual check-ins or try Chrome/Chromium.
        </div>
      )}
    </div>
  );
}