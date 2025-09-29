import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import UserModels from "../models/UserModels.js";
import DriverApplication from "../models/DriverApplicationsModels.js";
import { hashPassword, verifyPassword } from "../utils/passwordUtils.js";

const APPROVAL_REQUIRED_ROLES = new Set(["driver", "inspector"]);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateUserId(role) {
  const prefix = {
    customer: "CUS",
    vehicle_owner: "OWN",
    driver: "DRV",
    inspector: "INS",
    admin: "ADM",
  }[role] || "USR";

  return `${prefix}${Date.now().toString().slice(-6)}`;
}

function sanitizeUser(userDoc) {
  const user = userDoc.toObject({ getters: true });
  delete user.password;
  delete user.__v;
  return user;
}

async function ensureUniqueEmail(email) {
  const existing = await UserModels.findOne({ email });
  if (existing) {
    throw new Error("An account with this email already exists");
  }
}

function determineStatus(role) {
  return APPROVAL_REQUIRED_ROLES.has(role) ? "pending_verification" : "active";
}

function normalizeDriverRegistrationInput(payload) {
  const {
    licenseInfo,
    experience,
    documents,
    vehicleId,
    licenseNumber,
    licenseType,
    issueDate,
    expiryDate,
    issuingAuthority,
    yearsOfExperience,
    previousEmployers,
  } = payload;

  const normalizedLicenseInfo = {
    licenseNumber: (licenseNumber || licenseInfo?.licenseNumber || "").trim() || undefined,
    licenseType: (licenseType || licenseInfo?.licenseType || "").trim() || undefined,
    issueDate: (issueDate || licenseInfo?.issueDate)
      ? new Date(issueDate || licenseInfo?.issueDate)
      : undefined,
    expiryDate: (expiryDate || licenseInfo?.expiryDate)
      ? new Date(expiryDate || licenseInfo?.expiryDate)
      : undefined,
    issuingAuthority: (issuingAuthority || licenseInfo?.issuingAuthority || "").trim() || undefined,
  };

  const normalizedExperience = experience || {
    yearsOfExperience,
    previousEmployers,
  };

  const experiencePayload = {
    yearsOfExperience:
      normalizedExperience?.yearsOfExperience != null
        ? Number(normalizedExperience.yearsOfExperience)
        : undefined,
    previousEmployers: Array.isArray(normalizedExperience?.previousEmployers)
      ? normalizedExperience.previousEmployers
      : typeof normalizedExperience?.previousEmployers === "string"
        ? normalizedExperience.previousEmployers
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined,
  };

  return {
    licenseInfo: normalizedLicenseInfo,
    experience: experiencePayload,
    documents,
    vehicleId: vehicleId || undefined,
  };
}

async function createAccount(payload, role) {
  const {
    email,
    password,
    profile,
    preferences,
    notifications,
    nicNumber,
  } = payload;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (!profile) {
    throw new Error("Profile information is required");
  }

  await ensureUniqueEmail(email);

  const user = new UserModels({
    userId: generateUserId(role),
    nicNumber: nicNumber || undefined,
    email,
    password: hashPassword(password),
    role,
    profile: {
      ...profile,
      dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined,
    },
    status: determineStatus(role),
    preferences,
    notifications,
  });

  return user.save();
}

export async function registerCustomerOrOwner(req, res) {
  try {
    const { role } = req.body;
    if (!role || !["customer", "vehicle_owner"].includes(role)) {
      return res.status(400).json({ message: "Role must be customer or vehicle_owner" });
    }

    const createdUser = await createAccount(req.body, role);

    res.status(201).json({
      message: "Registration successful.",
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Registration failed" });
  }
}

export async function registerDriver(req, res) {
  try {
    const {
      licenseInfo: normalizedLicenseInfo,
      experience: experiencePayload,
      documents: normalizedDocuments,
      vehicleId: normalizedVehicleId,
    } = normalizeDriverRegistrationInput(req.body);

    if (!normalizedLicenseInfo.licenseNumber) {
      return res.status(400).json({ message: "Driver license number is required" });
    }

    const createdUser = await createAccount(req.body, "driver");

    await DriverApplication.create({
      applicationId: `APP${Date.now().toString().slice(-6)}`,
      email: createdUser.email,
      driverId: createdUser._id,
      vehicleId: normalizedVehicleId,
      licenseInfo: normalizedLicenseInfo,
      experience: experiencePayload,
      documents: normalizedDocuments,
      status: "under_review",
      reviewComments: "Pending admin review",
    });

    res.status(201).json({
      message: "Driver registration submitted. Please wait for admin approval.",
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Driver registration failed",
      details: error?.errors ?? undefined,
    });
  }
}

export async function registerInspector(req, res) {
  try {
    const createdUser = await createAccount(req.body, "inspector");

    res.status(201).json({
      message: "Inspector registration submitted. Please wait for admin approval.",
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Inspector registration failed" });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await UserModels.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = verifyPassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status !== "active") {
      if (user.role === "vehicle_owner" || user.role === "customer") {
        user.status = "active";
        await user.save();
      } else {
        return res.status(403).json({
          message: "Account pending approval",
          status: user.status,
        });
      }
    }

    const token = createSessionToken();

    res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
}

export async function googleLogin(req, res) {
  try {
    if (!GOOGLE_CLIENT_ID || !googleClient) {
      return res.status(500).json({ message: "Google authentication is not configured" });
    }

    const { idToken, role } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Google account is missing an email address" });
    }

    const user = await UserModels.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "No RentXpress account is linked to this Google email",
        email,
      });
    }

    const normalizedRole = typeof role === "string" ? role.trim() : undefined;
    if (normalizedRole && user.role !== normalizedRole) {
      return res.status(409).json({
        message: `This Google account is registered as ${user.role.replace("_", " ")}.`,
        expectedRole: user.role,
        email,
      });
    }

    if (user.status !== "active") {
      if (user.role === "customer" || user.role === "vehicle_owner") {
        user.status = "active";
        await user.save();
      } else {
        return res.status(403).json({
          message: "Account pending approval",
          status: user.status,
          email,
        });
      }
    }

    const token = createSessionToken();

    res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error("Google login failed", error);
    res.status(401).json({ message: "Google authentication failed" });
  }
}

export async function registerWithGoogle(req, res) {
  try {
    if (!GOOGLE_CLIENT_ID || !googleClient) {
      return res.status(500).json({ message: "Google authentication is not configured" });
    }

    const { idToken, role, profile, ...rest } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: "Google ID token is required" });
    }

    const normalizedRole = typeof role === "string" ? role.trim() : "";
    if (!normalizedRole || !["customer", "vehicle_owner", "driver", "inspector"].includes(normalizedRole)) {
      return res.status(400).json({ message: "A valid role is required" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Google account is missing an email address" });
    }

    if (payload?.email_verified === false) {
      return res.status(400).json({ message: "Google account email is not verified" });
    }

    const existing = await UserModels.findOne({ email });
    if (existing) {
      return res.status(409).json({
        message: "An account with this Google email already exists",
        role: existing.role,
        email,
      });
    }

    const randomPassword = crypto.randomBytes(32).toString("hex");

    const mergedProfile = {
      ...(profile || {}),
    };

    const fullName = payload?.name || "";
    if (!mergedProfile.firstName) {
      mergedProfile.firstName = payload?.given_name || fullName.split(" ")[0] || "";
    }
    if (!mergedProfile.lastName) {
      const familyName = payload?.family_name;
      if (familyName) {
        mergedProfile.lastName = familyName;
      } else if (fullName.includes(" ")) {
        mergedProfile.lastName = fullName.split(" ").slice(1).join(" ");
      }
    }
    if (!mergedProfile.profileImage && payload?.picture) {
      mergedProfile.profileImage = payload.picture;
    }

    const accountPayload = {
      ...rest,
      role: normalizedRole,
      email,
      password: randomPassword,
      profile: mergedProfile,
    };

    let createdUser;
    let responseMessage = "Registration successful.";

    if (normalizedRole === "driver") {
      const {
        licenseInfo: normalizedLicenseInfo,
        experience: experiencePayload,
        documents: normalizedDocuments,
        vehicleId: normalizedVehicleId,
      } = normalizeDriverRegistrationInput(accountPayload);

      if (!normalizedLicenseInfo.licenseNumber) {
        return res.status(400).json({ message: "Driver license number is required" });
      }

      createdUser = await createAccount(accountPayload, "driver");

      await DriverApplication.create({
        applicationId: `APP${Date.now().toString().slice(-6)}`,
        email: createdUser.email,
        driverId: createdUser._id,
        vehicleId: normalizedVehicleId,
        licenseInfo: normalizedLicenseInfo,
        experience: experiencePayload,
        documents: normalizedDocuments,
        status: "under_review",
        reviewComments: "Pending admin review",
      });

      responseMessage = "Driver registration submitted. Please wait for admin approval.";
    } else if (normalizedRole === "inspector") {
      createdUser = await createAccount(accountPayload, "inspector");
      responseMessage = "Inspector registration submitted. Please wait for admin approval.";
    } else {
      createdUser = await createAccount(accountPayload, normalizedRole);
    }

    res.status(201).json({
      message: responseMessage,
      user: sanitizeUser(createdUser),
    });
  } catch (error) {
    console.error("Google registration failed", error);
    const status =
      error?.name === "ValidationError" || error?.message?.toLowerCase().includes("required")
        ? 400
        : 500;
    res.status(status).json({ message: error.message || "Google registration failed" });
  }
}

export async function getApprovalStatus(req, res) {
  try {
    const { email } = req.params;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserModels.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ status: user.status, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch approval status" });
  }
}
