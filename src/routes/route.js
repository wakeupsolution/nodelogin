import express from "express";
import { CheckPropertyId } from "../controllers/login.js";

const router = express.Router();


router.post("/check-property", CheckPropertyId);
export default router;

