import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Building, Wifi, WifiOff, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { testSupabaseConnection } from "@/lib/supabaseConnectionTest";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; error?: string } | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Test connection on mount
    const checkConnection = async () => {
      setIsCheckingConnection(true);
      const status = await testSupabaseConnection();
      setConnectionStatus(status);
      setIsCheckingConnection(false);
      
      if (!status.connected && status.error) {
        toast({
          title: "Connection Error",
          description: status.error,
          variant: "destructive",
          duration: 10000,
        });
      }
    };
    
    checkConnection();
  }, [toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    // Check connection before attempting login
    if (!connectionStatus?.connected) {
      toast({
        title: "Connection Error",
        description: "Cannot connect to server. Please check your internet connection and try again.",
        variant: "destructive",
      });
      // Retest connection
      setIsCheckingConnection(true);
      const status = await testSupabaseConnection();
      setConnectionStatus(status);
      setIsCheckingConnection(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('authenticate_staff', {
        staff_email: email.trim().toLowerCase(),
        staff_password: password
      });

      if (error) {
        console.error("Supabase RPC error:", error);
        
        // Check for connection errors
        if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
          toast({
            title: "Connection Failed",
            description: "Cannot reach the server. This could mean:\n• Your internet connection is down\n• The Supabase project is paused/suspended\n• Firewall is blocking the connection\n\nPlease check your Supabase dashboard to ensure the project is active.",
            variant: "destructive",
            duration: 15000,
          });
          // Update connection status
          const status = await testSupabaseConnection();
          setConnectionStatus(status);
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to connect to server. Please check your connection.",
            variant: "destructive",
          });
        }
        return;
      }

      const result = data as any;
      console.log("Authentication result:", result);
      
      if (result && result.success) {
        login(result.staff, result.token, stayLoggedIn);
        toast({
          title: "Success",
          description: "Login successful",
        });
        navigate("/inventory");
      } else {
        toast({
          title: "Error",
          description: result?.error || "Invalid email or password. Please check your credentials.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: error?.message || "Login failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <Building className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Staff Login</CardTitle>
          <CardDescription>
            Sign in to access your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="stay-logged-in"
                checked={stayLoggedIn}
                onCheckedChange={(checked) => setStayLoggedIn(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="stay-logged-in"
                className="text-sm font-normal cursor-pointer"
              >
                Stay logged in
              </Label>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          
          {isCheckingConnection ? (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-muted-foreground animate-pulse" />
                <p className="text-sm text-muted-foreground">
                  Checking connection...
                </p>
              </div>
            </div>
          ) : connectionStatus && !connectionStatus.connected ? (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-start gap-2">
                <WifiOff className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-1">
                    Connection Failed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connectionStatus.error || "Cannot connect to server. Please check your Supabase project status."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Contact your administrator if you need access or have forgotten your password.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}