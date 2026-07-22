import express from "express";
import dotenv from "dotenv";
import testRoutes from "./src/routes/route.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api", testRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});