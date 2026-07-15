import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";
import { UserRole } from "../types";
import {
  Activity,
  ShieldAlert,
  HeartPulse,
  UserCircle,
  Users,
  Globe
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const testAccounts: Record<string, UserRole> = {
      "caregiver@sunrisecare.com": "caregiver",
      "rn@sunrisecare.com": "rn",
      "manager@sunrisecare.com": "manager",
      "family@sunrisecare.com": "family",
      "admin@sunrisecare.com": "admin",
    };

    if (testAccounts[email] && (password === "password123" || password === "••••••••••••")) {
      try {
        setError("");
        setLoading(true);
        if ("Notification" in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
          Notification.requestPermission();
        }
        await loginAsDemo(testAccounts[email]);
        navigate("/");
        return;
      } catch (err: any) {
        setError(t('err_test_login'));
        setLoading(false);
        return;
      }
    }

    try {
      setError("");
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed") {
        setError(t('err_auth_disabled'));
      } else {
        setError(t('err_invalid_creds'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError("");
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(t('err_google_login') + err.message);
      }
    }
  };

  const handlePreFill = (role: UserRole) => {
    const emails = {
      caregiver: "caregiver@sunrisecare.com",
      rn: "rn@sunrisecare.com",
      manager: "manager@sunrisecare.com",
      family: "family@sunrisecare.com",
      admin: "admin@sunrisecare.com"
    };
    setEmail(emails[role]);
    setPassword("••••••••••••");
    setError("");
    setActiveRole(role);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-indigo-800 to-teal-900 opacity-90 z-0"></div>

        {/* Decorative Circles */}
        <div className="absolute top-24 -left-24 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-48 -right-24 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2 bg-white/10 backdrop-blur rounded-xl">
            <Activity className="h-8 w-8 text-teal-400" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Sunrise Care
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            {t('system_title')}
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            {t('system_subtitle')}
          </p>
        </div>

        <div className="relative z-10 text-indigo-300 text-sm">
          &copy; {new Date().getFullYear()} Sunrise Care Systems. All rights
          reserved.
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative">
        {/* Language Toggle */}
        <div className="absolute top-4 right-4 relative self-start justify-self-end mt-4 mr-4 z-50 inline-flex items-center">
          <Globe className="w-5 h-5 text-slate-500 mr-1" />
          <select 
            value={lang} 
            onChange={(e) => setLang(e.target.value as any)}
            className="bg-transparent text-sm font-medium text-slate-600 focus:outline-none cursor-pointer"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="tl">Tagalog</option>
          </select>
        </div>
        <div className="max-w-md w-full space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex justify-center lg:hidden mb-6">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                <Activity className="h-8 w-8" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900">{t('welcome_back')}</h2>
            <p className="text-slate-500 mt-2">
              {t('sign_in_to_access')}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Quick Access */}
          <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              {t('staff_logins')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePreFill("caregiver")}
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all group ${
                  activeRole === "caregiver" 
                    ? "bg-indigo-50 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
                    : "bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                <UserCircle className={`w-6 h-6 mb-2 transition-colors ${activeRole === "caregiver" ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"}`} />
                <span className={`text-sm font-medium ${activeRole === "caregiver" ? "text-indigo-900" : "text-slate-700 group-hover:text-indigo-900"}`}>
                  {t('caregiver')}
                </span>
              </button>
              <button
                onClick={() => handlePreFill("rn")}
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all group ${
                  activeRole === "rn" 
                    ? "bg-teal-50 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.2)]" 
                    : "bg-white border-slate-200 hover:border-teal-300 hover:bg-teal-50"
                }`}
              >
                <HeartPulse className={`w-6 h-6 mb-2 transition-colors ${activeRole === "rn" ? "text-teal-600" : "text-slate-400 group-hover:text-teal-600"}`} />
                <span className={`text-sm font-medium ${activeRole === "rn" ? "text-teal-900" : "text-slate-700 group-hover:text-teal-900"}`}>
                  {t('rn')}
                </span>
              </button>
              <button
                onClick={() => handlePreFill("manager")}
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all group ${
                  activeRole === "manager" 
                    ? "bg-amber-50 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                    : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                <Users className={`w-6 h-6 mb-2 transition-colors ${activeRole === "manager" ? "text-amber-600" : "text-slate-400 group-hover:text-amber-600"}`} />
                <span className={`text-sm font-medium ${activeRole === "manager" ? "text-amber-900" : "text-slate-700 group-hover:text-amber-900"}`}>
                  {t('manager')}
                </span>
              </button>
              <button
                onClick={() => handlePreFill("family")}
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all group ${
                  activeRole === "family" 
                    ? "bg-pink-50 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]" 
                    : "bg-white border-slate-200 hover:border-pink-300 hover:bg-pink-50"
                }`}
              >
                <HeartPulse className={`w-6 h-6 mb-2 transition-colors ${activeRole === "family" ? "text-pink-600" : "text-slate-400 group-hover:text-pink-600"}`} />
                <span className={`text-sm font-medium ${activeRole === "family" ? "text-pink-900" : "text-slate-700 group-hover:text-pink-900"}`}>
                  {t('family_login')}
                </span>
              </button>
              <button
                onClick={() => handlePreFill("admin")}
                type="button"
                className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all group col-span-2 ${
                  activeRole === "admin" 
                    ? "bg-slate-900 border-slate-600 shadow-[0_0_15px_rgba(15,23,42,0.4)]" 
                    : "bg-slate-800 border-slate-700 hover:bg-slate-900"
                }`}
              >
                <ShieldAlert className={`w-6 h-6 mb-2 transition-colors ${activeRole === "admin" ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                <span className={`text-sm font-medium ${activeRole === "admin" ? "text-white" : "text-slate-300 group-hover:text-white"}`}>
                  {t('admin')}
                </span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">
              {t('or_sign_in_email')}
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {t('email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder={t('enter_email')}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  {t('password_label')}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium tracking-tight"
                >
                  {t('forgot_password')}
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder={t('enter_password')}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 font-medium transition-all shadow-sm shadow-indigo-200 disabled:opacity-50"
            >
              {loading ? t('signing_in') : t('sign_in')}
            </button>
          </form>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-medium transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t('continue_google')}
          </button>

          <div className="text-center text-sm text-slate-500 font-medium">
            {t('no_account')}{" "}
            <Link
              to="/register"
              className="text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {t('create_account')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
