import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/app");
    }, 800);
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-base font-semibold text-surface-900 tracking-tight select-none">SoilGuard</p>
          <p className="text-xs text-surface-400 mt-1">Soil intelligence for smallholder farmers</p>
        </div>

        {/* Card */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-base font-semibold text-surface-900 mb-5">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-xs font-medium text-surface-500 block mb-1.5">Email address</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-surface-900 placeholder-surface-300 focus:outline-none focus:border-surface-400 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-surface-500">Password</label>
                <button
                  type="button"
                  className="text-xs text-surface-400 hover:text-surface-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm bg-surface-50 border border-surface-200 rounded-lg px-3 py-2 text-surface-900 placeholder-surface-300 focus:outline-none focus:border-surface-400 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-semantic-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-surface-200" />
            <span className="text-[11px] text-surface-400">or</span>
            <div className="flex-1 h-px bg-surface-200" />
          </div>

          <button
            type="button"
            onClick={() => { setLoading(true); setTimeout(() => navigate("/app"), 600); }}
            className="w-full py-2.5 text-sm text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-100 hover:border-surface-300 transition-colors font-medium"
          >
            Continue with Google
          </button>
        </div>

        {/* Register link */}
        <p className="text-center text-xs text-surface-400 mt-5">
          New to SoilGuard?{" "}
          <Link to="/onboarding" className="text-accent hover:underline font-medium">
            Set up your first field
          </Link>
        </p>
      </div>
    </div>
  );
}
