import UserModels from "../models/UserModels.js";
import { hashPassword } from "../utils/passwordUtils.js";

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const user = userDoc.toObject({ getters: true });
  delete user.password;
  delete user.__v;
  return user;
}

// Get all users
export async function getAllUsers(req, res) {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.role) {
      query.role = req.query.role;
    }

    const users = await UserModels.find(query).select("-password");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsers controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get one user
export async function getUserById(req, res) {
  try {
    const user = await UserModels.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found!" });
    res.json(user);
  } catch (error) {
    console.error("Error in getUserById controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Add user
export async function createUser(req, res) {
  try {
    const { email, password, role, profile } = req.body;

    if (!email || !password || !role || !profile) {
      return res.status(400).json({ message: "Email, password, role and profile are required" });
    }

    const userId = "USR" + Date.now().toString().slice(-6);

    const newUser = new UserModels({
      userId,
      email,
      password: password.startsWith("$2") ? password : hashPassword(password),
      role,
      profile: {
        ...profile,
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
      },
    });

    const savedUser = await newUser.save();
    res.status(201).json(sanitizeUser(savedUser));
  } catch (error) {
    console.error("Error in createUser controller", error);
    res.status(400).json({
      message: "User creation failed",
      error: error.message,
    });
  }
}

// update User
export async function updateUser(req, res) {
  try {
    const updatePayload = { ...req.body };
    if (updatePayload.password) {
      updatePayload.password = updatePayload.password.startsWith("$2")
        ? updatePayload.password
        : hashPassword(updatePayload.password);
    }

    if (updatePayload.profile?.dateOfBirth) {
      updatePayload.profile = {
        ...updatePayload.profile,
        dateOfBirth: new Date(updatePayload.profile.dateOfBirth),
      };
    }

    const updatedUser = await UserModels.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully!", data: updatedUser });
  } catch (error) {
    console.error("Error in updateUser controller", error);
    res.status(400).json({
      message: "User update failed",
      error: error.message,
    });
  }
}

// delete user
export async function deleteUser(req, res) {
  try {
    const deletedUser = await UserModels.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully!" });
  } catch (error) {
    console.error("Error in deleteUser controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
