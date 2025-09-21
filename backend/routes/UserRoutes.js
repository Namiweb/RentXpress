//user routes
import express from "express";
import { createUser, getAllUsers, updateUser,deleteUser, getUserById } from "../controller/userController.js";

const router = express.Router();

// middleware
router.get("/",getAllUsers);
router.get("/:id",getUserById);
router.post("/", createUser);
router.put("/:id",updateUser);
router.delete("/:id",deleteUser);

export default router;