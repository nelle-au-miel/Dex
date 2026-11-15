import express from "express";
import cors from "cors";
import publicRouter from "./routes/public.js";
import adminRouter from "./routes/admin.js";

/* --------------------------------- CRÉER L'APPLICATION ------------------------------- */

const app = express();

app.use(cors());          // autorise les appels depuis un autre site
app.use(express.json());  // permet la lecture des corps JSON

app.use(publicRouter);
app.use(adminRouter);

/* --------------------------------- DÉMARRER LE SERVEUR ------------------------------- */

app.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});
