import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { MainLayout } from "@/components/layout";

const Landing = lazy(() => import("./pages/Landing"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const VerifyCode = lazy(() => import("./pages/VerifyCode"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Home = lazy(() => import("./pages/Home"));
const Explore = lazy(() => import("./pages/Explore"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      // Landing page (no header/footer)
      {
        path: "/",
        element: (
          <LazyPage>
            <Landing />
          </LazyPage>
        ),
      },

      // Auth pages (no header/footer)
      {
        path: "signup",
        element: (
          <LazyPage>
            <Signup />
          </LazyPage>
        ),
      },
      {
        path: "login",
        element: (
          <LazyPage>
            <Login />
          </LazyPage>
        ),
      },
      {
        path: "verify",
        element: (
          <LazyPage>
            <VerifyCode />
          </LazyPage>
        ),
      },
      {
        path: "onboarding",
        element: (
          <LazyPage>
            <Onboarding />
          </LazyPage>
        ),
      },

      // App pages (with header/footer)
      {
        element: <MainLayout />,
        children: [
          {
            path: "home",
            element: (
              <LazyPage>
                <Home />
              </LazyPage>
            ),
          },
          {
            path: "explore",
            element: (
              <LazyPage>
                <Explore />
              </LazyPage>
            ),
          },
          {
            path: "profile",
            element: (
              <LazyPage>
                <Profile />
              </LazyPage>
            ),
          },
        ],
      },

      // 404
      {
        path: "*",
        element: (
          <LazyPage>
            <NotFound />
          </LazyPage>
        ),
      },
    ],
  },
]);
