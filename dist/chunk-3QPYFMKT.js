import {
  guestGuard
} from "./chunk-H47UAPCH.js";
import "./chunk-FIY3KE23.js";
import "./chunk-LRT2RG6V.js";
import "./chunk-T45T4QAG.js";
import "./chunk-BTHEVO76.js";
import "./chunk-VXLC6YHT.js";
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
        loadComponent: () => import("./chunk-XPH4K23X.js").then((m) => m.LoginComponent),
        canActivate: [guestGuard],
        title: "Login - TG-Matrix"
      },
      {
        path: "register",
        loadComponent: () => import("./chunk-XYFHWCYI.js").then((m) => m.RegisterComponent),
        canActivate: [guestGuard],
        title: "Register - TG-Matrix"
      },
      {
        path: "forgot-password",
        loadComponent: () => import("./chunk-JPA72YLV.js").then((m) => m.ForgotPasswordComponent),
        canActivate: [guestGuard],
        title: "Forgot Password - TG-Matrix"
      },
      {
        path: "verify-email",
        loadComponent: () => import("./chunk-2KN4NZLF.js").then((m) => m.VerifyEmailComponent),
        title: "Verify Email - TG-Matrix"
      },
      {
        path: "reset-password",
        loadComponent: () => import("./chunk-6ZJM6AFR.js").then((m) => m.ResetPasswordComponent),
        canActivate: [guestGuard],
        title: "Reset Password - TG-Matrix"
      },
      {
        path: "telegram-callback",
        loadComponent: () => import("./chunk-IHMXMYG4.js").then((m) => m.TelegramCallbackComponent),
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
//# sourceMappingURL=chunk-3QPYFMKT.js.map
