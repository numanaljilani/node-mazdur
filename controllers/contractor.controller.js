import mongoose from "mongoose";
import { User } from "../models/Schema.js";

// Become a contractor
import cloudinary from "../utils/cloudinary.js";

export const becomeContractor = async (req, res) => {
  try {
    const { id } = req.params;
    // const { user: authUser } = req;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // if (id !== authUser.id) {
    //   return res.status(403).json({ error: 'Unauthorized to update this user' });
    // }

    const { service, subServices, price, unit, about } = req.body;
    console.log(req.body);
    const parsedSubService = Array.isArray(subServices)
      ? subServices
      : subServices?.split(",").map((item) => item.trim());
    console.log(parsedSubService , "SUB SERVICE");

    if (
      !service ||
      // !parsedSubService ||
      // !Array.isArray(parsedSubService) ||
      // availability === undefined ||
      // !locality ||
      !price ||
      !unit ||
      !about
    ) {
      return res
        .status(400)
        .json({ error: "All contractor fields are required" });
    }

    // ✅ Upload file to Cloudinary
    let uploadedFileUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload_stream(
        {
          folder: "mazdur_contractors",
          resource_type: "auto",
        },
        async (error, result) => {
          if (error) {
            return res.status(500).json({ error: "Cloudinary upload failed" });
          }

          uploadedFileUrl = result.secure_url;

          // ✅ Save user with file URL
          const user = await User.findByIdAndUpdate(
            id,
            {
              isContractor: true,
              service,
              subService: parsedSubService,
              // subService: [...subServices],
              availability,
              locality,
              price,
              unit,
              about,
              contractorFile: uploadedFileUrl,
              updatedAt: Date.now(),
            },
            { new: true, runValidators: true }
          ).select("-password -refreshToken");

          if (!user) {
            return res.status(404).json({ error: "User not found" });
          }

          return res.json({
            message: "Successfully became a contractor",
            user,
          });
        }
      );

      // Pipe the file buffer to the Cloudinary upload stream
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "mazdur_contractors",
          resource_type: "auto",
        },
        (error, result) => {
          if (error) return res.status(500).json({ error: error.message });
          // Continue here (already handled above)
        }
      );
      stream.end(req.file.buffer);
    } else {
      // ✅ Save user with file URL
      const user = await User.findByIdAndUpdate(
        id,
        {
          isContractor: true,
          service,
          subService: parsedSubService,
          // subService: [subService],
          // availability,
          // locality,
          price,
          unit,
          about,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true }
      ).select("-password -refreshToken");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // return res.status(400).json({ error: 'File is required' });
     return res.json({
            message: "Successfully became a contractor",
            user,
          });
    }
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to become contractor: ${error.message}` });
  }
};

// Get contractors with pagination, search, and filters
export const getContractors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      subService,
      service,
      ratingOrder,
    } = req.query;
    const query = { isContractor: true };

    // Search by fullname or email
    if (search) {
      query.$or = [
        { fullname: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by subService (check if any subService matches)
    if (subService) {
      query.subService = { $in: [subService] };
    }

    // Filter by service
    if (service) {
      query.service = service;
    }

    // Sort by rating (asc or desc)
    const sort = {};
    if (ratingOrder === "asc") {
      sort.rating = 1;
    } else if (ratingOrder === "desc") {
      sort.rating = -1;
    }

    const contractors = await User.find(query)
      .select("fullname bio image email phone address service locality rating  rewies")
      .sort(sort)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      contractors,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch contractors: ${error.message}` });
  }
};

// Get contractor details by ID
export const getContractorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid contractor ID" });
    }

    const contractor = await User.findById(id)
      .select("-password -refreshToken")
      .lean();

    if (!contractor || !contractor.isContractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    res.json(contractor);
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch contractor details: ${error.message}` });
  }
};
