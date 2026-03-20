import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  );
}
