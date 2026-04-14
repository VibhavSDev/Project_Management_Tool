import { useEffect, useState } from "react";
import API from "../services/axiosInstance";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/Tabs";
import { Loader2 } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [preferences, setPreferences] = useState({
    darkMode: true,
    emailNotifications: true,
    pushNotifications: false,
  });

  // =========================
  // Load profile
  // =========================
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get("/auth/me");
        const u = data.user;

        setUser(u);
        setName(u.username || "");
        setRole(u.role || "");
        setEmail(u.email || "");
      } catch (err) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Load preferences
  useEffect(() => {
    const saved = localStorage.getItem("preferences");
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("preferences", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const root = document.documentElement;

    if (preferences.darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [preferences.darkMode]);


  // =========================
  // Profile update
  // =========================
  const handleSaveProfile = async () => {
    console.log("Saving profile with name:", name);
    if (!user?.id) return;
    if (!name.trim() || name.length < 3) {
      return toast.error("Username must be at least 3 characters");
    }
    if (name.trim() === user.username) {
      return toast("No changes to save");
    }

    try {
      setSaving(true);
      const { data } = await API.put(`/users/${user.id}`, {
        username: name.trim(),
      });
      setUser(data.user);
      setName(data.user.username);
      console.log("Profile updated:", data.user);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Avatar upload
  // =========================
  const handleAvatarChange = (file) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("avatar", avatarFile);

      const { data } = await API.post(
        "/users/avatar",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setUser((prev) => ({ ...prev, avatar: data.avatar }));
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success("Avatar updated");
    } catch {
      toast.error("Avatar upload failed");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // Password update
  // =========================
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }

    try {
      setSaving(true);
      await API.post(`/users/${user.id}/change-password`, {
        newPassword,
      });
      toast.success("Password updated");
      setNewPassword("");
    } catch {
      toast.error("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Profile</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* ================= Overview ================= */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <img
                  src={
                    avatarPreview ||
                    user.avatar
                    ? `${
                        import.meta.env.VITE_API_URL.replace(
                          "/api",
                          ""
                        )
                      }/${user.avatar}`
                    : "/default-avatar.png" ||
                    "/default-avatar.png"
                  }
                  className="w-24 h-24 rounded-full object-cover border"
                />
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleAvatarChange(e.target.files[0])
                    }
                  />
                  <Button
                    className="mt-2"
                    onClick={handleUploadAvatar}
                    disabled={!avatarFile || saving}
                  >
                    {saving ? "Uploading..." : "Update Avatar"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Info label="Name" value={name} />
                <Info label="Email" value={email} />
                <Info label="Role" value={role} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Edit ================= */}
        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter username"
                />
                <p className="text-xs text-muted-foreground">
                  Username must be at least 3 characters
                </p>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={
                  saving ||
                  !name.trim() ||
                  name.trim().length < 3 ||
                  name.trim() === user?.username
                }
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Security ================= */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={saving}
              >
                {saving ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= Preferences ================= */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 max-w-md">
              {/* Dark Mode */}
              <PreferenceToggle
                label="Dark Mode"
                description="Use dark theme across the app"
                checked={preferences.darkMode}
                onChange={() =>
                  setPreferences((p) => ({
                    ...p,
                    darkMode: !p.darkMode,
                  }))
                }
              />

              {/* Email Notifications */}
              <PreferenceToggle
                label="Email Notifications"
                description="Receive updates via email"
                checked={preferences.emailNotifications}
                onChange={() =>
                  setPreferences((p) => ({
                    ...p,
                    emailNotifications: !p.emailNotifications,
                  }))
                }
              />

              {/* Push Notifications */}
              <PreferenceToggle
                label="Push Notifications"
                description="Enable in-app push notifications"
                checked={preferences.pushNotifications}
                onChange={() =>
                  setPreferences((p) => ({
                    ...p,
                    pushNotifications: !p.pushNotifications,
                  }))
                }
              />

              <p className="text-xs text-muted-foreground">
                Preferences are saved automatically.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ================= Helper =================
function Info({ label, value }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function PreferenceToggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4"
      />
    </div>
  );
}

