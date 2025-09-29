import UserModels from "../models/UserModels.js";
import { hashPassword, verifyPassword } from "./passwordUtils.js";

const DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "admin123@";
const DEFAULT_PROFILE = {
  firstName: "System",
  lastName: "Administrator",
  phoneNumber: "+10000000000",
  dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
};

function generateAdminUserId() {
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 90 + 10);
  return `ADM${randomPart}${timePart}`;
}

export async function ensureDefaultAdmin() {
  try {
    const existing = await UserModels.findOne({ email: DEFAULT_ADMIN_EMAIL });
    if (!existing) {
      await UserModels.create({
        userId: generateAdminUserId(),
        email: DEFAULT_ADMIN_EMAIL,
        password: hashPassword(DEFAULT_ADMIN_PASSWORD),
        role: "admin",
        status: "active",
        profile: DEFAULT_PROFILE,
      });
      console.info(`[auth] Created default admin user ${DEFAULT_ADMIN_EMAIL}`);
      return;
    }

    let dirty = false;

    if (existing.role !== "admin") {
      existing.role = "admin";
      dirty = true;
    }

    if (existing.status !== "active") {
      existing.status = "active";
      dirty = true;
    }

    if (!verifyPassword(DEFAULT_ADMIN_PASSWORD, existing.password)) {
      existing.password = hashPassword(DEFAULT_ADMIN_PASSWORD);
      dirty = true;
    }

    if (!existing.profile) {
      existing.profile = { ...DEFAULT_PROFILE };
      dirty = true;
    } else {
      if (!existing.profile.firstName) {
        existing.profile.firstName = DEFAULT_PROFILE.firstName;
        dirty = true;
      }
      if (!existing.profile.lastName) {
        existing.profile.lastName = DEFAULT_PROFILE.lastName;
        dirty = true;
      }
      if (!existing.profile.phoneNumber) {
        existing.profile.phoneNumber = DEFAULT_PROFILE.phoneNumber;
        dirty = true;
      }
      if (!existing.profile.dateOfBirth) {
        existing.profile.dateOfBirth = DEFAULT_PROFILE.dateOfBirth;
        dirty = true;
      }
    }

    if (dirty) {
      await existing.save();
      console.info(`[auth] Updated default admin user ${DEFAULT_ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error("[auth] Failed to ensure default admin user", error);
  }
}
