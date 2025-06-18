import express from "express";
import { config } from "dotenv";
import fs from "fs";
import swaggerUI from "swagger-ui-express";
import cors from "cors"; // ✅ IMPORTADO AQUI

config(); // carrega as variáveis do .env

const app = express();
const { PORT } = process.env;

// ✅ MIDDLEWARE CORS — deve vir antes das rotas
app.use(cors({
  origin: "http://localhost:8081", // ou '*' para liberar tudo (apenas para testes)
  credentials: true,
}));

app.use(express.json()); // Parse do JSON

// Import das rotas da aplicação
import RotasBeneficio from "./routes/beneficio.js";
import RotasUsuarios from "./routes/usuario.js";
import histRouter from "./routes/histRouter.js"; 

// Conteúdo público
app.use(express.static("public"));

// Segurança
app.disable("x-powered-by");

// Favicon
app.use("/favicon.ico", express.static("public/images/logo-api.png"));

// Swagger
const CSS_URL =
  "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css";

app.use(
  "/api/doc",
  swaggerUI.serve,
  swaggerUI.setup(
    JSON.parse(fs.readFileSync("./api/swagger/swagger_output.json")),
    {
      customCss:
        ".swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }",
      customCssUrl: CSS_URL,
    }
  )
);

// Rota default
app.get("/api", (req, res) => {
  res.status(200).json({
    message: "API FATEC 100% funcional🚀",
    version: "1.0.0",
  });
});

// Rotas da API
app.use("/api/beneficio", RotasBeneficio);
app.use("/api/usuario", RotasUsuarios);
app.use("/api/hist", histRouter);

// Listen
app.listen(PORT, function () {
  console.log(`💻Servidor rodando na porta ${PORT}`);
});
