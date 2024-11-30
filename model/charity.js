import mongoose from "mongoose";

const charitySchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
  },
  amount: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  phone: {
    type: String,
    required: [true, "Phone number is required"],
  },
  date: {
    type: Date,
    required: [true, "Appointment date is required"],
  },
  time: {
    type: String,
    required: [true, "Appointment time is required"],
  },

  reference: {
    type: String,
    required: true,
  },
  dateBooked: {
    type: Date,
    default: Date.now,
    required: true,
  },
});

export const Charity = mongoose.model("Charity", charitySchema);
