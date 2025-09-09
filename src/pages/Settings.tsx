import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Save, 
  ArrowLeft, 
  MapPin, 
  Mic, 
  Brain, 
  Moon, 
  Key,
  Globe,
  Volume2,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Settings() {
  const user = true as const; // single-user mode: always "signed in"
  const navigate = useNavigate();
  
  // Single-user mode: preferences will be stored locally
  const [microsoftClientId, setMicrosoftClientId] = useState("");
  const [microsoftClientSecret, setMicrosoftClientSecret] = useState("");
  const [microsoftTenantId, setMicrosoftTenantId] = useState("");
  
  // Location Settings
  const [timezone, setTimezone] = useState("UTC");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [autoCalculatePrayerTimes, setAutoCalculatePrayerTimes] = useState(true);
  const [prayerCalculationMethod, setPrayerCalculationMethod] = useState(2); // ISNA method
  
  // Hotword Settings
  const [hotwordEnabled, setHotwordEnabled] = useState(true);
  const [hotword, setHotword] = useState("assistant");
  const [hotwordSensitivity, setHotwordSensitivity] = useState(0.8);
  
  // AI Settings
  const [aiModel, setAiModel] = useState("phi3");
  const [aiPersonality, setAiPersonality] = useState("supportive");

  // Add: LLM provider & API key (for testing)
  const [llmProvider, setLlmProvider] = useState<"groq" | "google" | "ollama">("ollama");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmModel, setLlmModel] = useState("");
  // Convex backend URL override for single-user mode
  const [convexUrl, setConvexUrl] = useState("");

  // Voice Settings
  const [preferredVoice, setPreferredVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechVolume, setSpeechVolume] = useState(0.8);
  
  // Prayer Settings
  const [prayerRemindersEnabled, setPrayerRemindersEnabled] = useState(true);
  const [prayerTimes, setPrayerTimes] = useState([
    { name: "Fajr", time: "05:30", enabled: true },
    { name: "Dhuhr", time: "12:30", enabled: true },
    { name: "Asr", time: "15:30", enabled: true },
    { name: "Maghrib", time: "18:00", enabled: true },
    { name: "Isha", time: "19:30", enabled: true },
  ]);

  const [saving, setSaving] = useState(false);
  const [calculatingPrayerTimes, setCalculatingPrayerTimes] = useState(false);

  // Add prayer time calculation action
  const calculatePrayerTimes = useAction(api.prayers.calculatePrayerTimes);

  // Load existing preferences from localStorage (single-user mode)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("singleUserSettings");
      if (!raw) return;
      const s = JSON.parse(raw);
      setTimezone(s.timezone ?? "UTC");
      setLatitude(s.latitude ?? "");
      setLongitude(s.longitude ?? "");
      setAutoCalculatePrayerTimes(s.autoCalculatePrayerTimes ?? true);
      setPrayerCalculationMethod(s.prayerCalculationMethod ?? 2);
      setHotwordEnabled(s.hotwordEnabled ?? true);
      setHotword(s.hotword ?? "assistant");
      setHotwordSensitivity(s.hotwordSensitivity ?? 0.8);
      setPreferredVoice(s.preferredVoice ?? "");
      setSpeechRate(typeof s.speechRate === "number" ? s.speechRate : 1);
      setSpeechPitch(typeof s.speechPitch === "number" ? s.speechPitch : 1);
      setSpeechVolume(typeof s.speechVolume === "number" ? s.speechVolume : 0.8);
      setPrayerRemindersEnabled(s.prayerRemindersEnabled ?? true);
      if (Array.isArray(s.prayerTimes)) setPrayerTimes(s.prayerTimes);

      setMicrosoftClientId(s.microsoftClientId ?? "");
      setMicrosoftClientSecret(s.microsoftClientSecret ?? "");
      setMicrosoftTenantId(s.microsoftTenantId ?? "");

      // Load LLM provider, model, and API key (testing)
      setLlmProvider(s.llmProvider ?? "ollama");
      setLlmApiKey(s.llmApiKey ?? "");
      setLlmModel(s.llmModel ?? "");

      // Add Convex URL (backend) setting for overriding Convex client URL
      setConvexUrl(s.convexUrl ?? "");
    } catch {}
  }, []);

  // Get user's current location and calculate prayer times
  const getCurrentLocationAndCalculatePrayers = async () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setLatitude(lat.toString());
          setLongitude(lng.toString());
          toast.success("Location detected!");

          // Persist detected location immediately to localStorage (single-user mode)
          try {
            const raw = localStorage.getItem("singleUserSettings");
            const s = raw ? JSON.parse(raw) : {};
            s.latitude = lat.toString();
            s.longitude = lng.toString();
            localStorage.setItem("singleUserSettings", JSON.stringify(s));
          } catch {}

          if (autoCalculatePrayerTimes) {
            await calculatePrayerTimesForLocation(lat, lng);
          }
        },
        (error) => {
          toast.error("Failed to get location: " + error.message);
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser");
    }
  };

  // Calculate prayer times for given coordinates
  const calculatePrayerTimesForLocation = async (lat?: number, lng?: number) => {
    const latNum = lat || parseFloat(latitude);
    const lngNum = lng || parseFloat(longitude);
    
    if (!latNum || !lngNum) {
      toast.error("Please set location coordinates first");
      return;
    }
    
    setCalculatingPrayerTimes(true);
    try {
      const result = await calculatePrayerTimes({
        latitude: latNum,
        longitude: lngNum,
        method: prayerCalculationMethod,
      });
      
      if (result.success) {
        setPrayerTimes(result.prayerTimes);
        // Also persist calculated prayer times (and coords/timezone) to localStorage
        try {
          const raw = localStorage.getItem("singleUserSettings");
          const s = raw ? JSON.parse(raw) : {};
          s.prayerTimes = result.prayerTimes;
          s.latitude = latNum.toString();
          s.longitude = lngNum.toString();
          if (result.timezone) {
            s.timezone = result.timezone;
            setTimezone(result.timezone);
          }
          localStorage.setItem("singleUserSettings", JSON.stringify(s));
        } catch {}
        toast.success("Prayer times calculated automatically!");
      } else {
        toast.error("Failed to calculate prayer times: " + result.error);
      }
    } catch (error) {
      toast.error("Error calculating prayer times");
    } finally {
      setCalculatingPrayerTimes(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const data = {
        timezone,
        latitude,
        longitude,
        autoCalculatePrayerTimes,
        prayerCalculationMethod,
        hotwordEnabled,
        hotword,
        hotwordSensitivity,
        preferredVoice,
        speechRate,
        speechPitch,
        speechVolume,
        prayerRemindersEnabled,
        prayerTimes,
        microsoftClientId,
        microsoftClientSecret,
        microsoftTenantId,

        // Add: persist LLM provider & API key (testing)
        llmProvider,
        llmApiKey,
        // Use only the explicit model input; do not fall back to preset
        llmModel,

        // Add Convex URL to saved data
        convexUrl,
      };
      localStorage.setItem("singleUserSettings", JSON.stringify(data));
      localStorage.setItem("convexUrl", convexUrl || "");
      toast.success("Settings saved!");
    } catch (error) {
      toast.error("Failed to save settings locally");
    } finally {
      setSaving(false);
    }
  };

  const updatePrayerTime = (index: number, field: string, value: any) => {
    setPrayerTimes(prev => prev.map((prayer, i) => 
      i === index ? { ...prayer, [field]: value } : prayer
    ));
  };

  if (false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/")}
              className="border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Assistant Settings</h1>
              <p className="text-gray-400">Configure your AI accountability assistant</p>
            </div>
          </div>
          
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-[#00ff88] text-black hover:bg-[#00ff88]/90"
          >
            {saving ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Microsoft To-Do Integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Key className="w-5 h-5 mr-2 text-[#0078d4]" />
                Microsoft To-Do Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                Connect your Microsoft To-Do account to sync tasks automatically.
                You'll need to create an Azure App Registration to get these credentials.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type="password"
                    placeholder="Enter your Azure App Client ID"
                    value={microsoftClientId}
                    onChange={(e) => setMicrosoftClientId(e.target.value)}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Tenant ID</Label>
                  <Input
                    id="tenantId"
                    type="password"
                    placeholder="Enter your Azure Tenant ID"
                    value={microsoftTenantId}
                    onChange={(e) => setMicrosoftTenantId(e.target.value)}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Enter your Azure App Client Secret"
                  value={microsoftClientSecret}
                  onChange={(e) => setMicrosoftClientSecret(e.target.value)}
                  className="bg-black/40 border-gray-700"
                />
              </div>
              
              <div className="bg-[#0078d4]/10 border border-[#0078d4]/30 rounded p-3">
                <p className="text-[#0078d4] text-sm font-medium mb-1">Setup Instructions:</p>
                <ol className="text-white text-sm space-y-1 list-decimal list-inside">
                  <li>Go to Azure Portal → App Registrations</li>
                  <li>Create new registration with redirect URI</li>
                  <li>Add Microsoft Graph API permissions</li>
                  <li>Generate client secret</li>
                  <li>Copy Client ID, Tenant ID, and Secret here</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Location & Prayer Settings - Combined */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-[#ff0080]" />
                Location & Prayer Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location Detection */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="bg-black/40 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Dubai">Dubai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Current Location</Label>
                  <Button
                    variant="outline"
                    onClick={getCurrentLocationAndCalculatePrayers}
                    className="w-full border-gray-600"
                    disabled={calculatingPrayerTimes}
                  >
                    {calculatingPrayerTimes ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    ) : (
                      <Globe className="w-4 h-4 mr-2" />
                    )}
                    Detect Location & Calculate Prayers
                  </Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    placeholder="e.g., 40.7128"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    placeholder="e.g., -74.0060"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
              </div>

              <Separator className="bg-gray-700" />

              {/* Prayer Time Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoCalculate">Automatic Prayer Time Calculation</Label>
                    <p className="text-sm text-gray-400">Calculate prayer times based on your location</p>
                  </div>
                  <Switch
                    id="autoCalculate"
                    checked={autoCalculatePrayerTimes}
                    onCheckedChange={setAutoCalculatePrayerTimes}
                  />
                </div>

                {autoCalculatePrayerTimes && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="calculationMethod">Calculation Method</Label>
                      <Select 
                        value={prayerCalculationMethod.toString()} 
                        onValueChange={(value) => setPrayerCalculationMethod(parseInt(value))}
                      >
                        <SelectTrigger className="bg-black/40 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">University of Islamic Sciences, Karachi</SelectItem>
                          <SelectItem value="2">Islamic Society of North America (ISNA)</SelectItem>
                          <SelectItem value="3">Muslim World League</SelectItem>
                          <SelectItem value="4">Umm Al-Qura University, Makkah</SelectItem>
                          <SelectItem value="5">Egyptian General Authority of Survey</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => calculatePrayerTimesForLocation()}
                      disabled={!latitude || !longitude || calculatingPrayerTimes}
                      className="border-[#00ff88] text-[#00ff88]"
                    >
                      {calculatingPrayerTimes ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      ) : (
                        <Moon className="w-4 h-4 mr-2" />
                      )}
                      Recalculate Prayer Times
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="reminders">Prayer Reminders</Label>
                    <p className="text-sm text-gray-400">Get notified before prayer times</p>
                  </div>
                  <Switch
                    id="reminders"
                    checked={prayerRemindersEnabled}
                    onCheckedChange={setPrayerRemindersEnabled}
                  />
                </div>
                
                {!autoCalculatePrayerTimes && (
                  <div className="space-y-3">
                    <Label>Manual Prayer Times</Label>
                    {prayerTimes.map((prayer, index) => (
                      <div key={prayer.name} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Switch
                            checked={prayer.enabled}
                            onCheckedChange={(enabled) => updatePrayerTime(index, 'enabled', enabled)}
                          />
                          <span className="text-white font-medium">{prayer.name}</span>
                        </div>
                        <Input
                          type="time"
                          value={prayer.time}
                          onChange={(e) => updatePrayerTime(index, 'time', e.target.value)}
                          className="w-32 bg-black/40 border-gray-700"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Hotword & Voice Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Zap className="w-5 h-5 mr-2 text-[#0088ff]" />
                Hotword & Voice Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="hotwordEnabled">Hotword Activation</Label>
                  <p className="text-sm text-gray-400">Activate voice input with a hotword</p>
                </div>
                <Switch
                  id="hotwordEnabled"
                  checked={hotwordEnabled}
                  onCheckedChange={setHotwordEnabled}
                />
              </div>

              {hotwordEnabled && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotword">Hotword/Nickname</Label>
                    <Input
                      id="hotword"
                      placeholder="e.g., assistant, jarvis, alexa"
                      value={hotword}
                      onChange={(e) => setHotword(e.target.value)}
                      className="bg-black/40 border-gray-700"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sensitivity">Sensitivity: {Math.round(hotwordSensitivity * 100)}%</Label>
                    <Input
                      id="sensitivity"
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={hotwordSensitivity}
                      onChange={(e) => setHotwordSensitivity(parseFloat(e.target.value))}
                      className="bg-black/40 border-gray-700"
                    />
                  </div>
                </div>
              )}

              <Separator className="bg-gray-700" />
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voice">Preferred Voice</Label>
                  <Input
                    id="voice"
                    placeholder="e.g., Google US English"
                    value={preferredVoice}
                    onChange={(e) => setPreferredVoice(e.target.value)}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rate">Speech Rate: {speechRate}</Label>
                  <Input
                    id="rate"
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pitch">Speech Pitch: {speechPitch}</Label>
                  <Input
                    id="pitch"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={speechPitch}
                    onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="volume">Speech Volume: {Math.round(speechVolume * 100)}%</Label>
                  <Input
                    id="volume"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={speechVolume}
                    onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Brain className="w-5 h-5 mr-2 text-[#00ff88]" />
                AI Assistant Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider + Model */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="llmProvider">LLM Provider</Label>
                  <Select value={llmProvider} onValueChange={(v) => setLlmProvider(v as any)}>
                    <SelectTrigger className="bg-black/40 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ollama">Local (Ollama)</SelectItem>
                      <SelectItem value="groq">Groq (OpenAI-compatible)</SelectItem>
                      <SelectItem value="google">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aiModel">LLM Model</Label>
                  <Input
                    id="aiModel"
                    placeholder={
                      llmProvider === "groq"
                        ? "e.g., llama-3.3-70b-versatile"
                        : llmProvider === "google"
                        ? "e.g., gemini-1.5-flash"
                        : "e.g., phi3:mini"
                    }
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    className="bg-black/40 border-gray-700"
                  />
                </div>
              </div>

              {/* API Key (testing only) */}
              {llmProvider !== "ollama" && (
                <div className="space-y-2">
                  <Label htmlFor="llmApiKey">
                    {llmProvider === "groq" ? "Groq API Key" : "Google Gemini API Key"} (temporary testing)
                  </Label>
                  <Input
                    id="llmApiKey"
                    type="password"
                    placeholder={
                      llmProvider === "groq" ? "gsk_..." : "AI... (Google API key)"
                    }
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    className="bg-black/40 border-gray-700"
                  />
                  <p className="text-xs text-gray-400">
                    For testing only: Key is saved locally and sent to the server for this single-user setup.
                    For production, set provider keys in environment variables instead.
                  </p>
                </div>
              )}

              {/* Existing AI preferences */}
              <div className="grid md:grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personality">AI Personality</Label>
                  <Select value={aiPersonality} onValueChange={setAiPersonality}>
                    <SelectTrigger className="bg-black/40 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supportive">Supportive Coach</SelectItem>
                      <SelectItem value="strict">Strict Accountability</SelectItem>
                      <SelectItem value="friendly">Friendly Companion</SelectItem>
                      <SelectItem value="professional">Professional Assistant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Backend (Convex) section UI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Globe className="w-5 h-5 mr-2 text-[#00ff88]" />
                Backend (Convex)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">
                Enter your Convex deployment URL. This overrides the environment variable and removes the yellow warning banner.
              </p>
              <div className="space-y-2">
                <Label htmlFor="convexUrl">Convex URL</Label>
                <Input
                  id="convexUrl"
                  placeholder="https://your-deployment.convex.cloud or http://127.0.0.1:8187"
                  value={convexUrl}
                  onChange={(e) => setConvexUrl(e.target.value)}
                  className="bg-black/40 border-gray-700"
                />
                <p className="text-xs text-gray-500">
                  Example: http://127.0.0.1:8187 (local dev) or https://xxx.convex.cloud (production)
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}