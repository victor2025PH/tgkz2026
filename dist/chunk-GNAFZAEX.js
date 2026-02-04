import {
  guestGuard
} from "./chunk-KEAO7OI7.js";
import "./chunk-AHTF6AO6.js";
import "./chunk-LRT2RG6V.js";
import "./chunk-T45T4QAG.js";
import "./chunk-BTHEVO76.js";
import "./chunk-K4KD4A2Z.js";

// src/auth/auth.routes.ts
var AUTH_ROUTES = [
  {
    path: "",
    loadComponent: () => import("./chunk-TK2PTE5P.js").then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: "",
        redirectTo: "login",
        pathMatch: "full"
      },
      {
        path: "login",
        loadComponent: () => import("./chunk-JNEBW7TE.js").then((m) => m.LoginComponent),
        canActivate: [guestGuard],
        title: "Login - TG-Matrix"
      },
      {
        path: "register",
        loadComponent: () => import("./chunk-4CPJ7AOE.js").then((m) => m.RegisterComponent),
        canActivate: [guestGuard],
        title: "Register - TG-Matrix"
      },
      {
        path: "forgot-password",
        loadComponent: () => import("./chunk-KI6Z3MXX.js").then((m) => m.ForgotPasswordComponent),
        canActivate: [guestGuard],
        title: "Forgot Password - TG-Matrix"
      },
      {
        path: "verify-email",
        loadComponent: () => import("./chunk-7UVO6FEU.js").then((m) => m.VerifyEmailComponent),
        title: "Verify Email - TG-Matrix"
      },
      {
        path: "reset-password",
        loadComponent: () => import("./chunk-O525VURQ.js").then((m) => m.ResetPasswordComponent),
        canActivate: [guestGuard],
        title: "Reset Password - TG-Matrix"
      },
      {
        path: "telegram-callback",
        loadComponent: () => import("./chunk-WTBMG5QQ.js").then((m) => m.TelegramCallbackComponent),
        title: "Telegram Login - TG-Matrix"
      },
      {
        path: "scan-login",
        loadComponent: () => import("./chunk-56YQYCJM.js").then((m) => m.ScanLoginComponent),
        title: "Scan Login - TG-Matrix"
      }
    ]
  }
];
export {
  AUTH_ROUTES
};
//# sourceMappingURL=chunk-GNAFZAEX.js.map
