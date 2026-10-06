import { Router } from "express";
import { consultationController } from "../controllers/consultation.controller";

export const consultationRouter = Router();

consultationRouter.get("/slots", (req, res) => consultationController.getSlots(req, res));
consultationRouter.post("/book", (req, res) => consultationController.book(req, res));
