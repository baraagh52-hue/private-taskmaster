import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
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
  Volume2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Get current user preferences
  const userPreferences = useQuery(api.users.currentUser);
  const updateUserPreferences = useMutation(api.users.updateUserPreferences);
  
  // Microsoft To-Do Settings
  const [microsoftClientId, setMicrosoftClientId] = useState("");
  const [microsoftClientSecret, setMicrosoftClientSecret] = useState("");
  const [microsoftTenantId, setMicrosoftTenantId] = useState("");
  
  // Location Settings
  const [timezone, setTimezone] = useState("UTC");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  
  // AI Settings
  const [aiModel, setAiModel] = useState("phi3");
  const [aiPersonality, setAiPersonality] = useState("supportive");
  
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

  // Load existing preferences
  useEffect(() => {
    if (userPreferences) {
      setTimezone(userPreferences.timezone || "UTC");
      setPreferredVoice(userPreferences.preferredVoice || "");
      setSpeechRate(userPreferences.speechRate || 1);
      setSpeechPitch(userPreferences.speechPitch || 1);
      setSpeechVolume(userPreferences.speechVolume || 0.8);
      setPrayerRemindersEnabled(userPreferences.prayerRemindersEnabled ?? true);
      if (userPreferences.prayerTimes) {
        setPrayerTimes(userPreferences.prayerTimes);
      }
    }
  }, [userPreferences]);

  // Get user's current location
  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          toast.success("Location detected!");
        },
        (error) => {
          toast.error("Failed to get location: " + error.message);
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser");
    }
  };

  const handleSaveSettings = async () => {
    if (!user) {
      toast.error("Please sign in to save settings");
      return;
    }

    setSaving(true);
    try {
      await updateUserPreferences({
        timezone,
        preferredVoice,
        speechRate,
        speechPitch,
        speechVolume,
        prayerRemindersEnabled,
        prayerTimes,
        // Store Microsoft credentials (in production, these should be encrypted)
        microsoftClientId: microsoftClientId || undefined,
        microsoftClientSecret: microsoftClientSecret || undefined,
        microsoftTenantId: microsoftTenantId || undefined,
      });
      
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updatePrayerTime = (index: number, field: string, value: any) => {
    setPrayerTimes(prev => prev.map((prayer, i) => 
      i === index ? { ...prayer, [field]: value } : prayer
    ));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <SettingsIcon className="w-16 h-16 text-[#00ff88] mx-auto mb-4" />
          <p className="text-white text-xl mb-4">Please sign in to access settings</p>
          <Button onClick={() => navigate("/auth")} className="bg-[#00ff88] text-black">
            Sign In
          </Button>
        </div>
      </div>
    );
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

        {/* Location Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-[#ff0080]" />
                Location & Time Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    onClick={getCurrentLocation}
                    className="w-full border-gray-600"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Detect Location
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Voice Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Volume2 className="w-5 h-5 mr-2 text-[#0088ff]" />
                Voice & Speech Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

        {/* Prayer Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-black/40 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Moon className="w-5 h-5 mr-2 text-[#ff0080]" />
                Prayer Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              
              <Separator className="bg-gray-700" />
              
              <div className="space-y-3">
                <Label>Prayer Times</Label>
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
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aiModel">AI Model</Label>
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="bg-black/40 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phi3">Phi-3 (Default)</SelectItem>
                      <SelectItem value="gpt4">GPT-4 (Premium)</SelectItem>
                      <SelectItem value="claude">Claude (Premium)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
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
      </div>
    </div>
  );
}