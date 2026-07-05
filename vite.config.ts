import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { loadQuizFile } from "./lib/pipeline";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  function apiPlugin(): Plugin {
    return {
      name: "newser-api",
      configureServer(server) {
        const quizzes = loadQuizFile(env.QUIZ_SOURCE || undefined);

        server.middlewares.use("/api/quizzes", (_req, res) => {
          res.setHeader("Content-Type", "application/json");
          if (!quizzes) {
            res.statusCode = 503;
            res.end(JSON.stringify({ error: "No quiz data found. Run pnpm generate-quiz --fresh first." }));
            return;
          }
          res.end(JSON.stringify({ quizzes }));
        });
      },
    };
  }

  return { plugins: [react(), apiPlugin()] };
});
