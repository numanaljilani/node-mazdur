import exporess from "express";
import { checkUserAvailibility, deleteMyAccount, deleteUser, help, loginUser, me, registerUser, updateUser } from "../controllers/auth.controller.js";
import authenticate from "../middleware/authMiddleware.js";

const router = exporess.Router();

router.post("/delete-account",deleteMyAccount);
router.post("/help",help);



router.post("/isAvailable",checkUserAvailibility);
router.post("/register",registerUser);
router.post("/login",loginUser);
router.put("/me",authenticate,  me);
router.put("/update-user",authenticate,  updateUser);
router.delete("/delete-user/:id",deleteUser);

export default router;
