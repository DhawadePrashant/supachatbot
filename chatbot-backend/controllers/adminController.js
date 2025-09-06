const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");
const Company = require("../models/Company");
const Chatbot = require("../models/Chatbot");
const Message = require("../models/Message");

/**
 * Handles login for both Admins and Companies (Users).
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Check if admin
    const admin = await Admin.findOne({ email });
    if (admin) {
      const match = await bcrypt.compare(password, admin.password_hash);
      if (!match) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Add isSuperAdmin to the token payload
      const token = jwt.sign(
        {
          id: admin._id,
          email: admin.email,
          role: "admin",
          isSuperAdmin: admin.isSuperAdmin,
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      return res.json({
        token,
        role: "admin",
        user: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          isSuperAdmin: admin.isSuperAdmin, // ✅ ADD THIS LINE
        },
      });
    }

    // 2. Else, check Company (user)
    const company = await Company.findOne({ email: email.toLowerCase() });
    if (company) {
      const match = await bcrypt.compare(password, company.password_hash);
      if (!match) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: company._id, email: company.email, role: "user" },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      return res.json({
        token,
        role: "user",
        user: {
          id: company._id,
          email: company.email,
          name: company.name,
        },
      });
    }

    // 3. Not found in either
    return res.status(401).json({ message: "Invalid email or password" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

/**
 * Creates a new admin. Can optionally set them as a super admin.
 * The Mongoose pre-save hook on the Admin model will enforce the 3 super admin limit.
 */
exports.createAdmin = async (req, res) => {
  try {
    // MODIFIED: Destructure isSuperAdmin, defaulting to false
    const { name, email, password, isSuperAdmin = false } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res
        .status(409)
        .json({ message: "Admin with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
      name,
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      isSuperAdmin: isSuperAdmin, // Set the flag from the request
      created_at: new Date(),
    });

    // The .save() method will trigger the pre-save hook in your Admin model
    await newAdmin.save();

    return res.status(201).json({
      message: "Admin created successfully",
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        isSuperAdmin: newAdmin.isSuperAdmin,
        created_at: newAdmin.created_at,
      },
    });
  } catch (err) {
    console.error("CreateAdmin error:", err);
    // MODIFIED: Send a more specific error message from the hook if available
    return res.status(400).json({ message: err.message || "Server error" });
  }
};

exports.editAdmin = async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    // Basic validation
    if (!name && !email && !password) {
      return res.status(400).json({ message: "Nothing to update." });
    }

    // Check for duplicate email, excluding the current admin
    if (email) {
      const existing = await Admin.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "Email is already registered." });
      }
    }

    const updatePayload = {};
    if (name) updatePayload.name = name;
    if (email) updatePayload.email = email.toLowerCase();

    // If a new password is provided, hash it
    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters." });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updatePayload.password_hash = hashedPassword;
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(id, updatePayload, {
      new: true,
    });

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    res.status(200).json({ message: "Admin updated successfully" });
  } catch (err) {
    console.error("Edit admin error:", err.message);
    res.status(500).json({ message: "Server error while editing admin" });
  }
};

/**
 * ADDED: Gets all admins, excluding their passwords.
 * This route is protected and only accessible by super admins.
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const adminsFromDB = await Admin.find()
      .select("name email created_at isSuperAdmin")
      .lean() // Use .lean() to get plain JavaScript objects
      .sort({ created_at: -1 });

    // Add a test field to each admin object
    const adminsWithTestField = adminsFromDB.map((admin) => ({
      ...admin,
      testField: "Hello from the server!", // Our hardcoded test field
    }));

    // Log the final data being sent
    console.log("Final data being sent to frontend:", adminsWithTestField);

    res.status(200).json({ admins: adminsWithTestField });
  } catch (err) {
    console.error("Fetch admins error:", err.message);
    res.status(500).json({ message: "Server error while fetching admins" });
  }
};
/**
 * Gets dashboard statistics.
 */
exports.getStats = async (req, res) => {
  try {
    // 1. Total companies
    const totalCompanies = await Company.countDocuments();
    // 2. Total chatbots
    const totalChatbots = await Chatbot.countDocuments();
    // 3. Unique users (by distinct session_id in messages)
    const sessions = await Message.distinct("session_id");
    const unique_users = sessions.length;
    // 4. Total messages
    const totalMessages = await Message.countDocuments();
    // 5. Monthly token usage
    const currentMonth = new Date().getMonth();
    const chatbots = await Chatbot.find({}, "used_tokens last_reset");
    const monthlyTokenUsage = chatbots.reduce((sum, bot) => {
      const resetMonth = new Date(bot.last_reset).getMonth();
      return resetMonth === currentMonth ? sum + (bot.used_tokens || 0) : sum;
    }, 0);

    res.json({
      totalCompanies,
      totalChatbots,
      unique_users,
      totalMessages,
      monthlyTokenUsage,
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent a super admin from deleting their own account
    if (req.user.id === id) {
      return res.status(403).json({
        message: "Action forbidden: You cannot delete your own account.",
      });
    }

    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    res.status(200).json({ message: "Admin deleted successfully." });
  } catch (err) {
    console.error("Delete admin error:", err.message);
    res.status(500).json({ message: "Server error while deleting admin." });
  }
};

/**
 * Toggles the isSuperAdmin status of an admin.
 * Prevents the last super admin from revoking their own status.
 */
exports.toggleSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    // If attempting to demote a super admin, check if they are the last one
    if (admin.isSuperAdmin) {
      // A super admin cannot demote themselves if they are the last one
      if (req.user.id === id) {
        const superAdminCount = await Admin.countDocuments({
          isSuperAdmin: true,
        });
        if (superAdminCount <= 1) {
          return res.status(403).json({
            message:
              "Action forbidden: Cannot revoke status from the last super admin.",
          });
        }
      }
    }

    // Toggle the role
    admin.isSuperAdmin = !admin.isSuperAdmin;
    await admin.save();

    res.status(200).json({
      message: `Admin role updated. User is now ${
        admin.isSuperAdmin ? "a super admin" : "a regular admin"
      }.`,
      isSuperAdmin: admin.isSuperAdmin,
    });
  } catch (err) {
    console.error("Toggle role error:", err.message);
    res
      .status(500)
      .json({ message: "Server error while toggling admin role." });
  }
};
