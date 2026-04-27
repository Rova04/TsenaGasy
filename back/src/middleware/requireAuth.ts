// back/src/middleware/requireAuth.ts
import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // même clé que le front
);

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  
  if (!token) return res.status(401).json({ message: "Token manquant" });

  // Vérifie la session
  const { data, error } = await supabase.auth.getUser(token);

  // Si le token est expiré, essaie de le rafraîchir
  if (error && error.message.includes("expired")) {
    const refreshToken = req.headers["x-refresh-token"] as string;

    if (!refreshToken) {
      return res.status(401).json({ message: "Session expirée, reconnectez-vous." });
    }

    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (refreshError || !refreshed.session) {
      return res.status(401).json({ message: "Impossible de rafraîchir la session." });
    }

    // Renvoie le nouveau token (optionnel)
    res.setHeader("x-new-access-token", refreshed.session.access_token);
    (req as any).user = refreshed.session.user;
    return next();
  }

  if (error || !data.user) {
    return res.status(401).json({ message: "Token invalide" });
  }

  (req as any).user = data.user;
  next();
}

