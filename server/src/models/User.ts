import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const addressSchema = new Schema(
  {
    label: { type: String, default: 'Home' },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' },
    lat: Number,
    lng: Number,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    // Provider (supplier) login accounts are admin-managed, so the admin can
    // read back the password they set. Only populated for role 'provider'.
    plainPassword: { type: String, select: false },
    providerRef: { type: Schema.Types.ObjectId, ref: 'Provider' },
    role: {
      type: String,
      enum: ['customer', 'admin', 'provider'],
      default: 'customer',
    },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    googleId: { type: String, select: false },
    avatar: String,
    addresses: [addressSchema],
    refreshTokens: { type: [String], select: false },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    pendingEmail: { type: String, lowercase: true, trim: true, select: false },
    emailChangeOtp: { type: String, select: false },
    emailChangeOtpExpiry: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    pushToken: { type: String },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

export default mongoose.model<IUser>('User', userSchema);
