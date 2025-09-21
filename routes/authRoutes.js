import exporess from "express";
import { checkUserAvailibility, deleteMyAccount, deleteUser, help, loginUser, me, registerUser, registerUserWithImage, update_profile, updateUser, updateUserWithImage } from "../controllers/auth.controller.js";
import authenticate from "../middleware/authMiddleware.js";
import upload from "../services/multerService.js";

const router = exporess.Router();

router.post("/delete-account",deleteMyAccount);
router.post("/help",help);



router.post('/register-with-image', upload.single('file'), registerUserWithImage);
router.put('/update-with-image',authenticate, upload.single('file'), updateUserWithImage);
router.post('/update', upload.single('file'), update_profile);
router.post("/isAvailable",checkUserAvailibility);
router.post("/register",registerUser);
router.post("/login",loginUser);
router.get("/me",authenticate,  me);
router.put("/update-user",authenticate,  updateUser);
router.delete("/delete-user/:id",deleteUser);

export default router;
