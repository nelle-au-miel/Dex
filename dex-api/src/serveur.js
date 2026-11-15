import express from "express";
import publicRouter from "./routes/public.js";
import adminRouter from "./routes/admin.js";

/* --------------------------------- CRÉER L'APPLICATION ------------------------------- */

const app = express();

app.use(express.json());

app.use(publicRouter);
app.use(adminRouter);

/* --------------------------------- DÉMARRER LE SERVEUR ------------------------------- */

app.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});
