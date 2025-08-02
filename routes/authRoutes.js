import exporess from "express";
import { checkUserAvailibility, deleteUser, loginUser, me, registerUser, updateUser } from "../controllers/auth.controller.js";
import authenticate from "../middleware/authMiddleware.js";

const router = exporess.Router();

router.post("/isAvailable",checkUserAvailibility);
router.post("/register",registerUser);
router.post("/login",loginUser);
router.put("/me",authenticate,  me);
router.put("/update-user",authenticate,  updateUser);
router.delete("/delete-user",deleteUser);

export default router;
