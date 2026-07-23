import express from "express";
import { checkUserLogin } from "../controllers/login.js";

const router = express.Router();


router.post("/check-property", checkUserLogin);
export default router;

