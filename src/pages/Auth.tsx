import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plane, Mail, Lock, User } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <Plane className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">TravelHub</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Manage your travel<br />business beautifully.
          </h1>
          <p className="text-lg opacity-90 max-w-md">
            Build packages, calculate prices in multiple currencies, track every booking from draft to completion.
          </p>
          <div className="flex gap-6 pt-4">
            <div>
              <div className="text-3xl font-bold">1.2K+</div>
              <div className="text-sm opacity-80">Travelers</div>
            </div>
            <div>
              <div className="text-3xl font-bold">98%</div>
              <div className="text-sm opacity-80">Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm opacity-80">Support</div>
            </div>
          </div>
        </div>
        <div className="relative text-sm opacity-70">© 2026 TravelHub. All rights reserved.</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md border-0 shadow-elegant">
          <CardContent className="p-8 space-y-6">
            <div className="lg:hidden flex items-center gap-2 mb-4">
              <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
                <Plane className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">TravelHub</span>
            </div>

            <div>
              <h2 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create account"}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === "login" ? "Sign in to continue managing your packages" : "Start managing trips in minutes"}
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                toast.info("Connect Lovable Cloud to enable authentication");
              }}
            >
              {mode === "register" && (
                <div className="space-y-2">
                  <Label>Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Jane Doe" className="pl-9" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="you@example.com" className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="password" placeholder="••••••••" className="pl-9" />
                </div>
              </div>

              <Button type="submit" className="w-full gradient-primary text-primary-foreground shadow-md hover:opacity-90 transition-smooth">
                {mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-primary font-semibold hover:underline"
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </div>

            <div className="text-center pt-4 border-t">
              <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
                ← Back to dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
