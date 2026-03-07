import express from "express";
import { body, validationResult } from "express-validator";
import { supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
const MAX_USER_SCAN = 1000;
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
);

const findAuthUserByEmail = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: MAX_USER_SCAN });
  if (error) return { user: null, error };
  const user = data.users.find((item) => (item.email || "").toLowerCase() === normalizedEmail) ?? null;
  return { user, error: null };
};

const confirmUserAndSignIn = async (email, password, userId) => {
  const { error: confirmError } = await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
  if (confirmError) return { data: null, error: confirmError };
  return supabase.auth.signInWithPassword({ email, password });
};

const syncProfileRole = async (user, email) => {
  if (!user?.id) return;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const role = ADMIN_EMAILS.has(normalizedEmail) ? "admin" : "employee";
  const fallbackName = normalizedEmail.split("@")[0] || "User";

  await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: normalizedEmail,
        name: user.user_metadata?.name || fallbackName,
        role,
      },
      { onConflict: "id" }
    );
};

router.post(
  "/login",
  [body("email").isEmail(), body("password").isString().isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = req.body.email.trim().toLowerCase();
    const { password } = req.body;
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (!loginError) {
      await syncProfileRole(loginData.user, email);
      return res.json(loginData);
    }

    const loginMessage = loginError.message || "";
    if (/email not confirmed|email not verified/i.test(loginMessage)) {
      const { user, error: findUserError } = await findAuthUserByEmail(email);
      if (findUserError || !user?.id) {
        return res.status(403).json({ error: "Your account exists, but could not be auto-confirmed." });
      }
      const { data: confirmedLogin, error: confirmedLoginError } = await confirmUserAndSignIn(email, password, user.id);
      if (confirmedLoginError) {
        return res.status(403).json({ error: "Your account exists, but auto-confirm login failed." });
      }
      await syncProfileRole(confirmedLogin.user, email);
      return res.json(confirmedLogin);
    }

    const looksLikeFirstLogin = /invalid login credentials/i.test(loginMessage);
    if (!looksLikeFirstLogin) {
      return res.status(401).json({ error: loginMessage || "Unable to login." });
    }

    const fallbackName = email.split("@")[0] || "New User";
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: fallbackName } },
    });

    if (signUpError) {
      if (/already registered|already been registered/i.test(signUpError.message || "")) {
        const { user, error: findUserError } = await findAuthUserByEmail(email);
        if (!findUserError && user?.id && !user.email_confirmed_at) {
          const { data: confirmedLogin, error: confirmedLoginError } = await confirmUserAndSignIn(email, password, user.id);
          if (!confirmedLoginError) {
            await syncProfileRole(confirmedLogin.user, email);
            return res.json(confirmedLogin);
          }
        }
        return res.status(401).json({ error: "Incorrect email or password." });
      }
      return res.status(400).json({ error: signUpError.message });
    }

    if (!signUpData.session) {
      if (!signUpData.user?.id) {
        return res.status(403).json({ error: "Account created, but could not complete auto-login." });
      }
      const { data: confirmedLogin, error: confirmedLoginError } = await confirmUserAndSignIn(email, password, signUpData.user.id);
      if (confirmedLoginError) {
        return res.status(403).json({ error: "Account created, but auto-confirm login failed." });
      }
      await syncProfileRole(confirmedLogin.user, email);
      return res.status(201).json(confirmedLogin);
    }

    await syncProfileRole(signUpData.user, email);
    return res.status(201).json(signUpData);
  }
);

router.post(
  "/register",
  [body("email").isEmail(), body("password").isString().isLength({ min: 6 }), body("name").isString().isLength({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = req.body.email.trim().toLowerCase();
    const { password, name } = req.body;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) {
      if (/already registered|already been registered/i.test(error.message || "")) {
        return res.status(409).json({ error: "Email is already registered." });
      }
      return res.status(400).json({ error: error.message });
    }

    if (data.session) return res.status(201).json(data);
    if (!data.user?.id) {
      return res.status(403).json({ error: "Account created, but could not complete auto-login." });
    }

    const { data: confirmedLogin, error: confirmedLoginError } = await confirmUserAndSignIn(email, password, data.user.id);
    if (confirmedLoginError) {
      return res.status(403).json({ error: "Account created, but auto-confirm login failed." });
    }
    await syncProfileRole(confirmedLogin.user, email);
    return res.status(201).json(confirmedLogin);
  }
);

router.post("/logout", (_req, res) => res.json({ success: true }));

router.post("/delete-account", verifyToken, async (req, res) => {
  const userId = req.user.id;

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) return res.status(400).json({ error: error.message || "Unable to delete account." });

  res.json({ success: true });
});

export default router;
