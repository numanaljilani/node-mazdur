import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Message, User } from "../models/Schema.js";
import mongoose from "mongoose";

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

// Login user
export const loginUser = async (req, res) => {
  console.log(req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });

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

    let updateData = {...req.body};
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
     console.log(req.params.id , "req.params")
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

    const newMessage = await new Message({ name, userId, message , type : "delete" });
     await newMessage.save()
    res.json({ message: "Your account will be deleted in 24 hours." });
  } catch (error) {
    res.status(500).json({ error: `Failed to: ${error.message}` });
  }
};
export const help = async (req, res) => {
  console.log(req.body);
  try {
    const { name, userId, message } = req.body;

    const newMessage = await new Message({ name, userId, message, type : "help" });
    await newMessage.save()
    res.json({
      message: "Hour support team will contact you as soon as possible.",
    });
  } catch (error) {
    res.status(500).json({ error: `Failed to: ${error.message}` });
  }
};
