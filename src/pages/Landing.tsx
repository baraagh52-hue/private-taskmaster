import { motion } from "framer-motion";
import { Loader, Mic, Volume2, Brain, Moon, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from "react";

type LocalCheckins = Record<string, Record<string, { status: "completed" | "missed"; actualTime?: number }>>;

export default function Landing() {
  const demoText = "Welcome to your AI Accountability Assistant! I'm here to help you stay focused, track your goals, and maintain productive habits. Let's work together to achieve your objectives.";

  // Prayer data (works for guests with defaults)
  const prayerPreferences = useQuery(api.prayers.getPrayerPreferences);
  const todaysPrayerStatus = useQuery(api.prayers.getTodaysPrayerStatus);

  const DEFAULT_PRAYER_TIMES = [
    { name: "Fajr", time: "05:30", enabled: true },
    { name: "Dhuhr", time: "12:30", enabled: true },
    { name: "Asr", time: "15:30", enabled: true },
    { name: "Maghrib", time: "18:00", enabled: true },
    { name: "Isha", time: "19:30", enabled: true },
  ];

  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; targetTs: number; isTomorrow: boolean } | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // Add local guest check-ins store
  const [localCheckins, setLocalCheckins] = useState<LocalCheckins>({});

  // Add AI + STT test states and hooks
  const chatWithPhi3 = useAction(api.ai.chatWithPhi3);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string; time: number }>>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const sttSupported =
    typeof window !== "undefined" &&
    (("SpeechRecognition" in window) || ("webkitSpeechRecognition" in window));

  useEffect(() => {
    try {
      const saved = localStorage.getItem("localPrayerCheckins");
      if (saved) setLocalCheckins(JSON.parse(saved));
    } catch {}
  }, []);

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

  // Compute next prayer based on today's status or defaults (merge local guest check-ins)
  useEffect(() => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const source =
      (todaysPrayerStatus && todaysPrayerStatus.length > 0
        ? todaysPrayerStatus
        : (prayerPreferences?.prayerTimes ?? DEFAULT_PRAYER_TIMES).map((p: any) => ({ ...p, status: "pending" }))) as Array<any>;

    const todayKey = new Date().toISOString().split("T")[0];
    const mergedSource = source.map((p: any) => {
      const local = localCheckins[todayKey]?.[p.name];
      return local ? { ...p, status: local.status, actualTime: local.actualTime } : p;
    });

    const enabledSorted = [...mergedSource].filter((p) => p.enabled !== false).sort((a, b) => a.time.localeCompare(b.time));

    // Find first pending in the future
    let upcoming: any = enabledSorted.find((p) => (p.status ? p.status === "pending" : true) && timeToMinutes(p.time) > currentMins);
    let targetTs: number;
    let isTomorrow = false;

    if (upcoming) {
      targetTs = dateWithTime(now, upcoming.time).getTime();
    } else {
      // Pick first enabled tomorrow
      const firstTomorrow = enabledSorted[0] || { name: "Fajr", time: "05:30" };
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      targetTs = dateWithTime(tomorrow, firstTomorrow.time).getTime();
      upcoming = { name: firstTomorrow.name, time: firstTomorrow.time };
      isTomorrow = true;
    }

    setNextPrayer({ name: upcoming.name, time: upcoming.time, targetTs, isTomorrow });
  }, [prayerPreferences, todaysPrayerStatus, localCheckins]);

  // Replace sortedTodaysPrayers to merge local statuses
  const basePrayers =
    (todaysPrayerStatus && todaysPrayerStatus.length > 0
      ? todaysPrayerStatus
      : (prayerPreferences?.prayerTimes ?? DEFAULT_PRAYER_TIMES).map((p: any) => ({ ...p, status: "pending" })));
  const todayKey = new Date().toISOString().split("T")[0];
  const mergedPrayers = (basePrayers || []).map((prayer: any) => {
    const local = localCheckins[todayKey]?.[prayer.name];
    return local ? { ...prayer, status: local.status, actualTime: local.actualTime } : prayer;
  });
  const sortedTodaysPrayers = mergedPrayers?.sort(
    (a: any, b: any) => a.time.localeCompare(b.time)
  );

  const user = useQuery(api.users.currentUser);
  const recordPrayerCheckin = useMutation(api.prayers.recordPrayerCheckin);

  // Update: allow guest check-ins via localStorage (no sign-in needed)
  const handlePrayerCheckin = async (
    prayerName: string,
    scheduledTime: string,
    status: "completed" | "missed"
  ) => {
    // Authenticated path -> store on backend
    if (user) {
      try {
        await recordPrayerCheckin({ prayerName, scheduledTime, status });
        if (status === "completed") {
          toast.success(`🤲 ${prayerName} prayer recorded! Barakallahu feeki`);
        } else {
          toast(`${prayerName} prayer marked as missed. Allah is Most Forgiving 💚`);
        }
      } catch {
        toast.error("Failed to record prayer");
      }
      return;
    }

    // Guest path -> store locally
    try {
      const today = new Date().toISOString().split("T")[0];
      setLocalCheckins((prev: LocalCheckins) => {
        const updatedForDay = {
          ...(prev[today] || {}),
          [prayerName]: {
            status,
            actualTime: status === "completed" ? Date.now() : undefined,
          },
        };
        const updated = { ...prev, [today]: updatedForDay };
        try {
          localStorage.setItem("localPrayerCheckins", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (status === "completed") {
        toast.success(`🤲 ${prayerName} prayer recorded locally!`);
      } else {
        toast(`${prayerName} prayer marked as missed locally.`);
      }
    } catch {
      toast.error("Failed to record prayer locally");
    }
  };

  const scrollToChat = () => {
    const el = document.getElementById("tts-demo");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const startListening = () => {
    if (!sttSupported || listening) return;
    try {
      const Rec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new Rec();
      recognitionRef.current = rec;
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        const transcript = e?.results?.[0]?.[0]?.transcript || "";
        if (transcript) setUserInput(transcript);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      toast("Microphone is unavailable in this browser.");
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {}
    setListening(false);
  };

  const sendMessage = async () => {
    const text = userInput.trim();
    if (!text || sending) return;
    setMessages((m: Array<{ role: "user" | "assistant"; text: string; time: number }>) => [...m, { role: "user", text, time: Date.now() }]);
    setUserInput("");
    setSending(true);
    try {
      const res: any = await chatWithPhi3({
        prompt: text,
        context: nextPrayer ? `Next prayer: ${nextPrayer.name} at ${nextPrayer.time}` : "General",
      } as any);
      const aiText = res?.response || "No response.";
      setMessages((m: Array<{ role: "user" | "assistant"; text: string; time: number }>) => [...m, { role: "assistant", text: aiText, time: Date.now() }]);
    } catch (e: any) {
      toast.error(`AI error: ${e?.message || "Failed to send message"}`);
    } finally {
      setSending(false);
    }
  };

  const handleVoiceInteractionClick = () => {
    scrollToChat();
    if (sttSupported) {
      startListening();
    } else {
      toast("Speech-to-text is not supported in this browser.");
    }
  };

  const handleGoalTrackingClick = () => {
    scrollToChat();
    toast("Use the chat to log goals or ask for accountability prompts.");
  };

  const handleSmartInsightsClick = () => {
    scrollToChat();
    toast("Ask the AI for insights or tips in the chat.");
  };

  const handleGetStarted = () => {
    const el = document.getElementById("prayers") || document.getElementById("tts-demo");
    if (el) el.scrollIntoView({ behavior: "smooth" });
    else toast("Scroll down to explore the features on this page.");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-background to-secondary/20"
    >
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          {/* Logo and Title */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <div className="relative">
                <img
                  src="./logo.svg"
                  alt="AI Assistant Logo"
                  width={80}
                  height={80}
                  className="rounded-2xl shadow-lg"
                />
                <div className="absolute -top-2 -right-2 bg-primary rounded-full p-2">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI Accountability Assistant
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your personal AI companion for staying focused, tracking goals, and building productive habits with voice interaction.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto"
          >
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Volume2 className="h-5 w-5 text-primary" />
                  Voice Interaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Communicate naturally with your AI assistant using text-to-speech technology.
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={handleVoiceInteractionClick}>
                  Try voice
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mic className="h-5 w-5 text-primary" />
                  Goal Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Set, monitor, and achieve your personal and professional objectives.
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={handleGoalTrackingClick}>
                  Explore goals
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-primary" />
                  Smart Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get personalized recommendations and insights to improve your productivity.
                </p>
                <Button size="sm" variant="outline" className="mt-3" onClick={handleSmartInsightsClick}>
                  See insights
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Prayer Times Section */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-3xl mx-auto w-full px-4"
            id="prayers"
          >
            <Card className="bg-gradient-to-r from-[#ff0080]/10 to-[#00ff88]/10 border-[#00ff88]/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Moon className="h-5 w-5 text-[#ff0080]" />
                  Today's Prayers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextPrayer && (
                  <div className="mb-4 p-4 rounded-lg border bg-black/30 border-[#00ff88]/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-[#00ff88]" />
                      <div>
                        <div className="text-sm text-gray-400">Next Prayer</div>
                        <div className="text-lg font-semibold text-white">
                          {nextPrayer.name} <span className="text-gray-400">at {nextPrayer.time}{nextPrayer.isTomorrow ? " (tomorrow)" : ""}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${countdown === "Now" ? "text-[#ff0080]" : "text-[#00ff88]"}`}>{countdown}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
                              onClick={() =>
                                handlePrayerCheckin(prayer.name, prayer.time, "completed")
                              }
                              className="h-6 w-6 p-0 border-[#00ff88] text-[#00ff88]"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handlePrayerCheckin(prayer.name, prayer.time, "missed")
                              }
                              className="h-6 w-6 p-0 border-[#ff0080] text-[#ff0080]"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {prayer.status === "completed" && (
                          <Check className="w-4 h-4 text-[#00ff88]" />
                        )}
                        {prayer.status === "missed" && (
                          <X className="w-4 h-4 text-[#ff0080]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Test Section (replaces previous TTS Demo) */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            id="tts-demo"
            className="max-w-2xl mx-auto"
          >
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Test AI Assistant
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mic className={`h-4 w-4 ${listening ? "text-primary animate-pulse" : ""}`} />
                    {sttSupported ? (listening ? "Listening..." : "Mic Ready") : "STT Unavailable"}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {messages.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Type a message below or tap the mic to dictate, then press Send. Ask for goals, accountability, or prayer-related prompts.
                    </div>
                  ) : (
                    messages.map((m: { role: "user" | "assistant"; text: string; time: number }, idx: number) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-md text-sm ${
                          m.role === "user"
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-secondary/50 border border-secondary/20"
                        }`}
                      >
                        {m.text}
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type a message or use the mic..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                    }}
                  />
                  {sttSupported && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={listening ? stopListening : startListening}
                      className={listening ? "border-primary text-primary" : ""}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={sendMessage}
                    disabled={sending || !userInput.trim()}
                  >
                    {sending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      "Send"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <Button size="lg" className="px-8 py-3 text-lg" onClick={handleGetStarted}>
              Get Started
            </Button>
            <p className="text-xs text-muted-foreground">
              No external dependencies • Browser-native TTS • Privacy-focused
            </p>
          </motion.div>

        </div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="border-t bg-background/50 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-center">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Loader className="h-4 w-4 animate-spin" />
            <span>Powered by</span>
            <a
              href="https://vly.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
            >
              vly.ai
            </a>
          </div>
        </div>
      </motion.footer>
    </motion.div>
  );
}