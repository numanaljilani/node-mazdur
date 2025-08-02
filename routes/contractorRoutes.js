
import exporess from "express";
import authenticate from "../middleware/authMiddleware.js";
import { becomeContractor, getContractorDetails, getContractors } from "../controllers/contractor.controller.js";
import { upload } from "../utils/memoryStorage.js";

const router = exporess.Router();


// Contractor Routes
router.post(
  '/user/:id/become-contractor',
  upload.single('file'), // 'file' is the field name from FormData
  becomeContractor
);
router.get('/contractors', getContractors);
router.get('/contractors/:id', getContractorDetails);


export default router;