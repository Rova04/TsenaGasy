// back/server.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import routes from "./src/routes/routes";
import path from "path";

const app = express();

app.use(cors());

// Permettre à Express de parser le JSON dans le corps des requêtes
app.use(express.json());

// Permettre à Express de parser les données de formulaires URL-encodées
app.use(express.urlencoded({ extended: true }));

// Routes 
app.use('/api', routes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/factures",
  express.static(path.join(process.cwd(), "src/public/factures"))
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré et à l'écoute de http://localhost:${PORT}`);
});
