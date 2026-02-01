import {
  guestGuard
} from "./chunk-N57L3E3X.js";
import "./chunk-7DUCTZ33.js";
import "./chunk-6TNMQ6CH.js";
import "./chunk-7CO55ZOM.js";
import "./chunk-Y4VZODST.js";

// src/auth/auth.routes.ts
var AUTH_ROUTES = [
  {
    path: "",
    loadComponent: () => import("./chunk-F6BQI6OI.js").then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: "",
        redirectTo: "login",
        pathMatch: "full"
      },
      {
        path: "login",
        loadComponent: () => import("./chunk-HMSAUVLK.js").then((m) => m.LoginComponent),
        canActivate: [guestGuard],
        title: "Login - TG-Matrix"
      },
      {
        path: "register",
        loadComponent: () => import("./chunk-MOWUUDTD.js").then((m) => m.RegisterComponent),
        canActivate: [guestGuard],
        title: "Register - TG-Matrix"
      },
      {
        path: "forgot-password",
        loadComponent: () => import("./chunk-KINC6UUY.js").then((m) => m.ForgotPasswordComponent),
        canActivate: [guestGuard],
        title: "Forgot Password - TG-Matrix"
      },
      {
        path: "verify-email",
        loadComponent: () => import("./chunk-FRG7A5N4.js").then((m) => m.VerifyEmailComponent),
        title: "Verify Email - TG-Matrix"
      },
      {
        path: "reset-password",
        loadComponent: () => import("./chunk-EICLMRSF.js").then((m) => m.ResetPasswordComponent),
        canActivate: [guestGuard],
        title: "Reset Password - TG-Matrix"
      },
      {
        path: "telegram-callback",
        loadComponent: () => import("./chunk-IEU5ZTCQ.js").then((m) => m.TelegramCallbackComponent),
        title: "Telegram Login - TG-Matrix"
      }
    ]
  }
];
export {
  AUTH_ROUTES
};
//# sourceMappingURL=chunk-6FVLDQGH.js.map
