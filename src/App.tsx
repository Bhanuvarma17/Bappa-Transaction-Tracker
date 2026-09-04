import React, { useState, useEffect } from "react";
import { User, Profile, Expense } from "./types";
import { api, clearToken } from "./api";
import { Navbar } from "./components/Navbar";
import { Dashboard } from "./components/Dashboard";
import { AuthPage } from "./components/AuthPage";
import { PublicProfile } from "./components/PublicProfile";
import { NotFoundPage } from "./components/NotFoundPage";
import { ProfileEditorModal } from "./components/ProfileEditorModal";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Navigation state
  // routes: 'dashboard' | 'login' | 'signup' | 'public-profile' | 'not-found'
  const [currentRoute, setCurrentRoute] = useState<string>("dashboard");
  const [routeParam, setRouteParam] = useState<string>("");

  // Modal
  const [isNavProfileModalOpen, setIsNavProfileModalOpen] = useState(false);

  // Sync state with URL
  const parseLocation = () => {
    const rawPath = window.location.pathname;
    const decodedPath = decodeURIComponent(rawPath);

    if (decodedPath === "/" || decodedPath === "/dashboard") {
      return { route: "dashboard", param: "" };
    }
    if (decodedPath === "/login") {
      return { route: "login", param: "" };
    }
    if (decodedPath === "/signup") {
      return { route: "signup", param: "" };
    }
    if (decodedPath === "/not-found") {
      return { route: "not-found", param: "" };
    }

    // Any other path is considered a public committee username (e.g. /SBVMB Youth)
    const committeeName = decodedPath.startsWith("/") ? decodedPath.slice(1) : decodedPath;
    if (committeeName.trim()) {
      return { route: "public-profile", param: committeeName.trim() };
    }

    return { route: "dashboard", param: "" };
  };

  const navigateTo = (path: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    const { route, param } = parseLocation();
    setCurrentRoute(route);
    setRouteParam(param);
  };

  // Initial Auth & route check
  useEffect(() => {
    async function init() {
      try {
        const me = await api.getMe();
        if (me) {
          setCurrentUser(me.user);
          setCurrentProfile(me.profile);
          const expList = await api.getExpenses();
          setExpenses(expList);
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsAuthChecking(false);
      }
    }

    init();

    const { route, param } = parseLocation();
    setCurrentRoute(route);
    setRouteParam(param);

    const onPopState = () => {
      const parsed = parseLocation();
      setCurrentRoute(parsed.route);
      setRouteParam(parsed.param);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const refreshExpenses = async () => {
    if (currentUser) {
      try {
        const list = await api.getExpenses();
        setExpenses(list);
      } catch (err) {
        console.error("Failed to reload expenses:", err);
      }
    }
  };

  const handleAuthSuccess = async (user: User, profile: Profile) => {
    setCurrentUser(user);
    setCurrentProfile(profile);
    const expList = await api.getExpenses();
    setExpenses(expList);
    navigateTo("/dashboard");
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentProfile(null);
    setExpenses([]);
    navigateTo("/login");
  };

  const handleViewPublicProfile = (username: string) => {
    navigateTo(`/${encodeURIComponent(username)}`);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] flex items-center justify-center transition-colors">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#FF9933] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#2D3436] dark:text-[#F1F2F6]">Initializing Ganesh Tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDFB] dark:bg-[#121316] flex flex-col font-sans text-[#2D3436] dark:text-[#F1F2F6] transition-colors">
      {/* Top Navigation */}
      <Navbar
        profile={currentProfile}
        onOpenProfileEditor={() => setIsNavProfileModalOpen(true)}
        onViewPublicProfile={handleViewPublicProfile}
        onLogout={handleLogout}
        onGoToAuth={(mode) => navigateTo(`/${mode}`)}
      />

      {/* Main View Router */}
      <div className="flex-1">
        {/* PUBLIC COMMITTEE PROFILE VIEW */}
        {currentRoute === "public-profile" && routeParam && (
          <PublicProfile
            username={routeParam}
            onNavigateHome={() => navigateTo("/dashboard")}
            onNotFound={(failedName) => {
              setRouteParam(failedName);
              setCurrentRoute("not-found");
            }}
            isLoggedInUser={
              Boolean(currentProfile && currentProfile.normalizedUsername === routeParam.toLowerCase())
            }
            onGoToDashboard={() => navigateTo("/dashboard")}
          />
        )}

        {/* NOT FOUND PAGE */}
        {currentRoute === "not-found" && (
          <NotFoundPage
            requestedUsername={routeParam || "Unknown"}
            onNavigateHome={() => navigateTo("/dashboard")}
            onSelectCommittee={(name) => handleViewPublicProfile(name)}
            onGoToSignUp={(pref) => {
              navigateTo("/signup");
            }}
          />
        )}

        {/* AUTH SCREENS */}
        {(currentRoute === "login" || currentRoute === "signup") && (
          <AuthPage
            initialMode={currentRoute === "login" ? "login" : "signup"}
            initialUsername={routeParam}
            onSuccess={handleAuthSuccess}
            onExploreCommittees={() => handleViewPublicProfile("SBVMB Youth")}
          />
        )}

        {/* PRIVATE DASHBOARD OR GUEST PORTAL */}
        {currentRoute === "dashboard" && (
          currentUser && currentProfile ? (
            <Dashboard
              user={currentUser}
              profile={currentProfile}
              expenses={expenses}
              onRefreshData={refreshExpenses}
              onViewPublicProfile={handleViewPublicProfile}
              onUpdateProfileState={(updated) => setCurrentProfile(updated)}
              onUpdateExpensesState={(newExpenses) => setExpenses(newExpenses)}
            />
          ) : (
            <AuthPage
              initialMode="login"
              onSuccess={handleAuthSuccess}
              onExploreCommittees={() => handleViewPublicProfile("SBVMB Youth")}
            />
          )
        )}
      </div>

      {/* Navbar Profile Editor Modal */}
      {currentProfile && (
        <ProfileEditorModal
          isOpen={isNavProfileModalOpen}
          onClose={() => setIsNavProfileModalOpen(false)}
          currentProfile={currentProfile}
          onSave={async (updatedData) => {
            const res = await api.updateProfile(updatedData);
            setCurrentProfile(res.profile);
          }}
        />
      )}
    </div>
  );
}
