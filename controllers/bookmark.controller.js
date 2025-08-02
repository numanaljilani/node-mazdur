import mongoose from "mongoose";
import { Bookmark, User } from "../models/Schema.js";

// Toggle bookmark (add or remove)
export const toggleBookmark = async (req, res) => {
  try {
    const { contractorId } = req.params;
    const { userId } = req.query;
    console.log(req.query);
    const { user: authUser } = req; // From authenticateToken middleware
    if (!mongoose.Types.ObjectId.isValid(contractorId)) {
      return res.status(400).json({ error: "Invalid contractor ID" });
    }

    const contractor = await User.findById(contractorId);
    if (!contractor || !contractor.isContractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    const existingBookmark = await Bookmark.findOne({
      userId: userId,
      contractorId,
    });
    if (existingBookmark) {
      // Remove bookmark
      await Bookmark.deleteOne({ _id: existingBookmark._id });

      // Remove bookmark from user's bookmark array
      await User.findByIdAndUpdate(userId, {
        $pull: { bookmark: existingBookmark._id },
      });

      res.json({ message: "Bookmark removed successfully", bookmarked: false });
    } else {
      // Add bookmark
      const bookmark = new Bookmark({ userId: userId, contractorId });
      await bookmark.save();

      // Add bookmark to user's bookmark array
      await User.findByIdAndUpdate(userId, {
        $push: { bookmark: bookmark._id },
      });

      res
        .status(201)
        .json({
          message: "Bookmark added successfully",
          bookmark,
          bookmarked: true,
        });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to toggle bookmark: ${error.message}` });
  }
};

// Get user's bookmarked contractors with pagination
export const getBookmarks = async (req, res) => {
  try {
    const { page = 1, limit = 10 , userId } = req.query;
    console.log(req.query)
    const { user: authUser } = req; // From authenticateToken middleware

    const bookmarks = await Bookmark.find({ userId:userId })
      .populate(
        "contractorId",
        "fullname email service subService locality price unit about rating rewies"
      )
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Bookmark.countDocuments({ userId:userId });

    res.json({
      bookmarks,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch bookmarks: ${error.message}` });
  }
};
