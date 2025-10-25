import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Message, User } from "../models/Schema.js";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// Generate access and refresh tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "10d" }
  );
  const refreshToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "10d" }
  );
  return { accessToken, refreshToken };
};

// Register a new user
export const registerUser = async (req, res) => {
  console.log(req.body);
  try {
    const { fullname, email, password, ...rest } = req.body;
    if (!fullname || !email || !password) {
      return res
        .status(400)
        .json({ error: "Fullname, email, and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const user = new User({
      fullname,
      email,
      password: await bcrypt.hash(password, 10),
      ...rest,
    });
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        ...user.toObject(),
        password: undefined,
        refreshToken: undefined,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to register user: ${error.message}` });
  }
};

// Register a new user with FormData and optional image
export const registerUserWithImage = async (req, res) => {
  console.log(req.file, "FLIE");
  try {
    const { fullname, email, password, nikname, phone, address, dob } =
      req.body;
    const file = req?.file; // Type assertion for multer

    // Validate required fields
    if (!fullname || !email || !password) {
    return res
        .status(400)
        .json({ error: "Fullname, email, and password are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("first Exist")
       return res.status(400).json({ 
        success: false,
        error: "Email already exists" 
      });
    }

    // Handle image upload to Cloudinary
    let profileImage = "";
    if (file) {
      // Convert buffer to base64
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString(
        "base64"
      )}`;

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: "mazdur/profiles",
        public_id: `user_${email}_${Date.now()}`,
        resource_type: "image",
      });

      profileImage = result.secure_url;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      fullname,
      email,
      password: hashedPassword,
      nikname: nikname || "",
      phone: phone || "",
      address: address || "",
      dob: dob ? new Date(dob) : undefined,
      image: profileImage,
    });
    console.log("Working craeted db");

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;

    // Save user
    await user.save();

    // Remove sensitive fields
    const userResponse = {
      ...user.toObject(),
      password: undefined,
      refreshToken: undefined,
    };
    // SUCCESS: Return consistent success response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        image: user.image
        // Include other fields you need
      },
      accessToken // Include token if needed
    });
  } catch (error) {
    console.error(error);
     return res
      .status(500)
      .json({ error: `Failed to register user: ${error.message}` });
  }
};
// Update user profile with image replacement
export const updateUserWithImage = async (req, res) => {
  try {
    console.log(req.body);
    const { fullname, email, nikname, phone, address, dob } = req.body;
    const file = req?.file; // Multer uploaded file
    const { user: authUser } = req;
    const userId = authUser?.id; // User ID from URL
    console.log(authUser, userId);

    // Find the existing user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ If a new file is uploaded, delete the old image from Cloudinary
    let profileImage = user.image; // Keep existing image if no new file
    if (file) {
      // Delete old image from Cloudinary if exists
      if (user.image) {
        const publicId = user.image.split("/").pop().split(".")[0];
        // Example: https://res.cloudinary.com/.../mazdur/profiles/user_abc_xyz.jpg → user_abc_xyz

        await cloudinary.uploader.destroy(`mazdur/profiles/${publicId}`);
      }

      // Upload new image
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString(
        "base64"
      )}`;
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: "mazdur/profiles",
        public_id: `user_${email || user.email}_${Date.now()}`,
        resource_type: "image",
      });

      profileImage = result.secure_url;
    }

    // Update allowed fields (password not updated here)
    user.fullname = fullname || user.fullname;
    user.email = email || user.email;
    user.nikname = nikname || user.nikname;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.dob = dob ? new Date(dob) : user.dob;
    user.image = profileImage;

    // Save updated user
    await user.save();

    // Prepare safe response
    const userResponse = {
      ...user.toObject(),
      password: undefined,
      refreshToken: undefined,
    };

    res.status(200).json({
      message: "User updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Failed to update user: ${error.message}` });
  }
};

// New Google Auth controller
export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Google token is required' });
    }

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
  
    if (!payload) {
      return res.status(400).json({ error: 'Invalid Google token' });
    }

    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });
    console.log(user , "USER" , email)
    let isNewUser = false;

    if (!user) {
      // Register new user
      isNewUser = true;
      user = new User({
        fullname: name,
        email,
        image: picture || '',
        password: '', // No password for Google users
      });
      const { accessToken, refreshToken } = generateTokens(user);
      user.refreshToken = refreshToken;
      await user.save();
      res.status(201).json({
        message: 'User registered successfully',
        user: { ...user.toObject(), password: undefined, refreshToken: undefined },
        accessToken,
        refreshToken,
        isNewUser,
      });
    } else {
      // Login existing user
      console.log('exsisting user' , user)
      const { accessToken, refreshToken } = generateTokens(user);
      user.refreshToken = refreshToken;
 const data = await user.toObject();
      res.status(200).json({
        message: 'User logged in successfully',
        user: { ...data, password: undefined, refreshToken: undefined },
        accessToken,
        refreshToken,
        isNewUser,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: `Google authentication failed: ${error.message}` });
  }
};

// Update user profile
export const update_profile = async (req, res) => {
  try {
    // Assuming FormData is parsed by middleware (e.g., multer)
    const { fullname, nikname, phone, address, dob, userId } = req.body;
    const file = req.files?.file; // Adjust based on your middleware

    // Validate required fields
    if (!userId || !fullname) {
      return res
        .status(400)
        .json({ error: "userId and fullname are required" });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Handle image upload to Cloudinary
    let profileImage = user.profileImage;
    if (file) {
      // Validate file type
      const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!allowedTypes.includes(file.mimetype)) {
        return res
          .status(400)
          .json({
            error: "Invalid file type. Only JPEG, PNG, and GIF are allowed",
          });
      }

      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(
        file.path || file.buffer,
        {
          folder: "mazdur/profiles",
          public_id: `user_${userId}_${Date.now()}`,
          resource_type: "image",
        }
      );

      profileImage = result.secure_url;
    }

    // Update user fields
    user.fullname = fullname;
    user.nikname = nikname || user.nikname;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.dob = dob ? new Date(dob) : user.dob;
    user.profileImage = profileImage;

    // Save updated user
    await user.save();

    // Remove sensitive fields
    const userResponse = {
      ...user.toObject(),
      password: undefined,
      refreshToken: undefined,
    };

    res.status(200).json({
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: `Failed to update profile: ${error.message}` });
  }
};

// Login user
export const loginUser = async (req, res) => {
  console.log(req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({
      email: { $regex: email, $options: "i" },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // user.password = await bcrypt.hash("mazdur@123", 10);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log(isPasswordValid, "isPasswordValid");
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      message: "Login successful",
      user: {
        ...user.toObject(),
        password: undefined,
        refreshToken: undefined,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to login: ${error.message}` });
  }
};
// checkUserAvailibility user
export const checkUserAvailibility = async (req, res) => {
  console.log(req.body);
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (user) {
      return res
        .status(401)
        .json({ message: "This email is already registered.", success: false });
    }

    res.json({
      message: "Login successful",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to login: ${error.message}` });
  }
};
// Login user
export const me = async (req, res) => {
  try {
    const { user: authUser } = req;
    console.log(req.body);
    const user = await User.findById(authUser?.id);
    if (!user) {
      return res.status(401).json({ error: "No Data Found" });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refreshToken = refreshToken;

    res.json({
      user: {
        ...user.toObject(),
        password: undefined,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to login: ${error.message}` });
  }
};

// Refresh access token
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      message: "Token refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    res
      .status(403)
      .json({ error: `Failed to refresh token: ${error.message}` });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  try {
    const { user: authUser } = req; // From authenticateToken middleware
    console.log("inside update user");
    if (!mongoose.Types.ObjectId.isValid(authUser?.id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    let updateData = { ...req.body };
    // ✅ Check if email already exists
    if (req?.body?.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: authUser?.id },
      });
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }
      updateData.email = req?.body?.email;
    }

    // ✅ Hash password if provided
    if (req?.body?.password) {
      updateData.password = await bcrypt.hash(req.body?.password, 10);
    }

    // ✅ Upload photo if provided
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "mazdur_users",
            resource_type: "image",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      updateData.photo = uploadResult.secure_url;
    }

    // ✅ Update user in DB
    const user = await User.findByIdAndUpdate(
      authUser?.id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: `Failed to update user: ${error.message}` });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  console.log(req.params.id, "req.params");
  try {
    const { id } = req.params;

    const { user: authUser } = req; // From authenticateToken middleware
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: `Failed to delete user: ${error.message}` });
  }
};

export const deleteMyAccount = async (req, res) => {
  console.log(req.body);
  try {
    const { name, userId, message } = req.body;

    const newMessage = await new Message({
      name,
      userId,
      message,
      type: "delete",
    });
    await newMessage.save();
    res.json({ message: "Your account will be deleted in 24 hours." });
  } catch (error) {
    res.status(500).json({ error: `Failed to: ${error.message}` });
  }
};
export const help = async (req, res) => {
  console.log(req.body);
  try {
    const { name, userId, message } = req.body;

    const newMessage = await new Message({
      name,
      userId,
      message,
      type: "help",
    });
    await newMessage.save();
    res.json({
      message: "Hour support team will contact you as soon as possible.",
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to: ${error.message}` });
  }
};
export const report  = async (req, res) => {
  console.log(req.body);
  try {
    const { name, userId, message } = req.body;

    const newMessage = await new Message({
      name,
      userId,
      message,
      type: "report",
    });
    await newMessage.save();
    res.json({
      message: "Hour support team will contact you as soon as possible.",
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to: ${error.message}` });
  }
};



export const bulkRegisterUsers = async (req, res) => {
    // 1. Validate the request body
    const usersData = req.body; 

    if (!Array.isArray(usersData) || usersData.length === 0) {
        return res.status(400).json({ error: 'Request body must be a non-empty array of user objects for bulk registration.' });
    }

    const results = { successes: [], failures: [] };
    const saltRounds = 10; // Standard bcrypt salt rounds

    // 2. Process each user sequentially to avoid potential race conditions on email check
    for (const userData of usersData) {
        // Use a try/catch block for each individual user to ensure the whole batch doesn't fail
        try {
            const { fullname, email, password, ...rest } = userData;

            // Basic Validation Check
            if (!fullname || !email || !password) {
                results.failures.push({ email: email || 'N/A', reason: 'Missing required fields (fullname, email, or password).' });
                continue;
            }
            
            // 3. Check for existing user (Duplicate Email Check)
            // NOTE: Replace `User` with your actual Mongoose Model
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                results.failures.push({ email, reason: 'Email already exists. Skipping registration.' });
                continue;
            }

            // 4. Hash Password (CRITICAL)
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // 5. Create new User document
            const newUser = new User({
                fullname,
                email,
                password: hashedPassword,
                ...rest, // Includes phone, address, isContractor, service, subService, etc.
                createdAt: new Date(), // Manually set if timestamps are not auto-handled
                updatedAt: new Date(),
            });

            // 6. Save the user
            await newUser.save();
            
            // Collect success result
            results.successes.push({ email, fullname, id: newUser._id });

        } catch (error) {
            // Collect failure result
            const email = userData.email || 'N/A';
            results.failures.push({ email, reason: `Database/Schema validation failed: ${error.message}` });
        }
    }

    // 7. Send final summary response
    // Use 207 Multi-Status if there were partial failures, otherwise 201 Created.
    const statusCode = results.failures.length > 0 ? 207 : 201; 

    res.status(statusCode).json({
        message: 'Bulk user registration process complete.',
        totalProcessed: usersData.length,
        totalSuccess: results.successes.length,
        totalFailure: results.failures.length,
        results: results
    });
};