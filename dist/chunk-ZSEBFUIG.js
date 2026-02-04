import {
  guestGuard
} from "./chunk-VQR5VYK7.js";
import "./chunk-423OWQPI.js";
import "./chunk-ZLNZFOTQ.js";
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
        loadComponent: () => import("./chunk-VZJAVGXV.js").then((m) => m.LoginComponent),
        canActivate: [guestGuard],
        title: "Login - TG-Matrix"
      },
      {
        path: "register",
        loadComponent: () => import("./chunk-SDHX35CV.js").then((m) => m.RegisterComponent),
        canActivate: [guestGuard],
        title: "Register - TG-Matrix"
      },
      {
        path: "forgot-password",
        loadComponent: () => import("./chunk-DJBCDNRQ.js").then((m) => m.ForgotPasswordComponent),
        canActivate: [guestGuard],
        title: "Forgot Password - TG-Matrix"
      },
      {
        path: "verify-email",
        loadComponent: () => import("./chunk-VMRISVHI.js").then((m) => m.VerifyEmailComponent),
        title: "Verify Email - TG-Matrix"
      },
      {
        path: "reset-password",
        loadComponent: () => import("./chunk-UJ4TVFJF.js").then((m) => m.ResetPasswordComponent),
        canActivate: [guestGuard],
        title: "Reset Password - TG-Matrix"
      },
      {
        path: "telegram-callback",
        loadComponent: () => import("./chunk-JWEKUNB7.js").then((m) => m.TelegramCallbackComponent),
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
//# sourceMappingURL=chunk-ZSEBFUIG.js.map
