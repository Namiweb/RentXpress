import UserModels from "../models/UserModels.js";

// Get all users
export async function getAllUsers(req, res) {
  try {
    const users = await UserModels.find();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error in getAllUsers controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Get one user
export async function getUserById(req, res) {
  try {
    const user = await UserModels.findById(req.params.id);
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
    const {
      email,
      password,
      role,
      profile: { firstName, lastName, phoneNumber, dateOfBirth },
    } = req.body;

    // Generate a unique userId (you can modify this logic as needed)
    const userId = "USR" + Date.now().toString().slice(-6); 

    const newUser = new UserModels({
      userId,
      email,
      password,
      role,
      profile: {
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth: new Date(dateOfBirth),
      },
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
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
    const updatedUser = await UserModels.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

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
