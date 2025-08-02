import multer from 'multer';

const storage = multer.memoryStorage(); // Use memory for direct Cloudinary upload

export const upload = multer({ storage });
