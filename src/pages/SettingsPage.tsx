import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Bell, Shield, Key, Moon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";

interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  notifications: boolean;
  readReceipts: boolean;
  twoFactor: boolean;
}

const getStoredUser = (): StoredUser => {
  const defaults: StoredUser = {
    id: "",
    username: "",
    displayName: "",
    email: "",
    notifications: true,
    readReceipts: true,
    twoFactor: false,
  };
  try {
    const user: unknown = JSON.parse(localStorage.getItem("user") || "null");
    if (typeof user !== "object" || user === null) {
      return defaults;
    }

    const storedUser = user as Record<string, unknown>;
    return {
      id: typeof storedUser.id === "string" ? storedUser.id : "",
      username: typeof storedUser.username === "string" ? storedUser.username : "",
      displayName: typeof storedUser.displayName === "string" ? storedUser.displayName : "",
      email: typeof storedUser.email === "string" ? storedUser.email : "",
      notifications: typeof storedUser.notifications === "boolean" ? storedUser.notifications : true,
      readReceipts: typeof storedUser.readReceipts === "boolean" ? storedUser.readReceipts : true,
      twoFactor: typeof storedUser.twoFactor === "boolean" ? storedUser.twoFactor : false,
    };
  } catch (error) {
    console.error("Failed to load the signed-in user profile:", error);
    return defaults;
  }
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const [storedUser] = useState(getStoredUser);
  const [displayName, setDisplayName] = useState(storedUser.displayName || storedUser.username);
  const [email, setEmail] = useState(storedUser.email);
  const [notifications, setNotifications] = useState(storedUser.notifications);
  const [readReceipts, setReadReceipts] = useState(storedUser.readReceipts);
  const [twoFactor, setTwoFactor] = useState(storedUser.twoFactor);
  const initials = displayName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName,
          email,
          notifications,
          readReceipts,
          twoFactor,
        }),
      });
      const data: { user?: StoredUser; error?: string } = await response.json();
      if (!response.ok || !data.user) {
        toast({
          title: "Could not save settings",
          description: data.error || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      const accounts: Array<{ user: StoredUser; token: string }> = JSON.parse(localStorage.getItem("accounts") || "[]");
      const accountIndex = accounts.findIndex((account) => account.user.id === data.user?.id);
      if (accountIndex >= 0) {
        accounts[accountIndex] = { ...accounts[accountIndex], user: data.user };
      } else {
        accounts.unshift({ user: data.user, token });
      }
      localStorage.setItem("accounts", JSON.stringify(accounts));

      toast({ title: "Settings saved", description: "Your profile and preferences have been updated." });
      navigate("/chat");
    } catch (error) {
      console.error("Save settings error:", error);
      toast({
        title: "Could not save settings",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/chat")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Profile Section */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Profile</h2>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" className="border-border hover:bg-muted">
              Change Avatar
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-input border-border mt-2"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input border-border mt-2"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive notifications for new messages</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Read Receipts</p>
                <p className="text-sm text-muted-foreground">Let others know when you've read their messages</p>
              </div>
              <Switch checked={readReceipts} onCheckedChange={setReadReceipts} />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Security</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
            </div>
            <div className="pt-4 border-t border-border">
              <Button variant="outline" className="w-full border-border hover:bg-muted">
                <Key className="w-4 h-4 mr-2" />
                View Security Keys
              </Button>
            </div>
            <div>
              <Button variant="outline" className="w-full border-border hover:bg-muted">
                Change Password
              </Button>
            </div>
            <div>
              <Button 
                variant="outline" 
                className="w-full border-border hover:bg-muted text-destructive hover:text-destructive"
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  localStorage.removeItem("accounts");
                  navigate("/");
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/chat")}
            className="flex-1 border-border hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
