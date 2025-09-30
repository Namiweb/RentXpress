import express from "express";
import {
  registerCustomerOrOwner,
  registerDriver,
  registerInspector,
  login,
  googleLogin,
  registerWithGoogle,
  getApprovalStatus,
} from "../controller/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/login/google", googleLogin);
router.post("/register/google", registerWithGoogle);
router.post("/register/customer-owner", registerCustomerOrOwner);
router.post("/register/driver", registerDriver);
router.post("/register/inspector", registerInspector);
router.get("/status/:email", getApprovalStatus);

export default router;
