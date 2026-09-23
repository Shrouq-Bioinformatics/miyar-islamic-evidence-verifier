import { Router, type IRouter } from "express";
import healthRouter from "./health";
import verifyRouter from "./verify";
import casesRouter from "./cases";

const router: IRouter = Router();

router.use(healthRouter);
router.use(verifyRouter);
router.use(casesRouter);

export default router;
