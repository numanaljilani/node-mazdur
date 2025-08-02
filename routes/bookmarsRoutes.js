
import exporess from "express";
import authenticate from "../middleware/authMiddleware.js";
import { getBookmarks, toggleBookmark } from "../controllers/bookmark.controller.js";

const router = exporess.Router();


router.post('/bookmarks/:contractorId',  toggleBookmark);
router.get('/bookmarks',  getBookmarks);

export default router;