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
    const { email, password, role, firstName, lastName, phoneNumber } = req.body;
    const newUser = new UserModels({ email, password, role, firstName, lastName, phoneNumber });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    console.error("Error in createUser controller", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// update User
export async function updateUser(req, res) {
  try {
    const { email, password, role, firstName, lastName, phoneNumber } = req.body;
    const updatedUser = await UserModels.findByIdAndUpdate(
      req.params.id,
      { email, password, role, firstName, lastName, phoneNumber },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User updated successfully!", data: updatedUser });
  } catch (error) {
    console.error("Error in updateUser controller", error);
    res.status(500).json({ message: "Internal server error" });
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
