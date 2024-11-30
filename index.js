import express from "express";
import "dotenv/config.js";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
import { Charity } from "./model/charity.js";
import { transporter } from "./controller/transporter.js";  
import twilio from "twilio";
import dotenv from 'dotenv';  // Import dotenv
dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;

// Create a Twilio client
const client = new twilio(accountSid, authToken);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to the MongoDB database."))
  .catch((error) => console.error("MongoDB connection error:", error));


let email, amount, name, phone, date, time;

// Endpoint to initiate payment
app.post("/api/payment/initialize", async (req, res) => {
  ({ email, amount, name, phone, date, time } = req.body);

  if (
    !email ||
    !amount ||
    !name ||
    !phone ||
    !date ||
    !time 
  ) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const params = {
    email,
    amount,
    callback_url: 'http://localhost:3000',
  };

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      params,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    const data = response.data;

    res.status(200).json(data);
  } catch (error) {
    console.error("Error initializing payment:", error.message);
    if (error.response) {
      // Respond with the error from Paystack
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Server Error!" });
    }
  }
});

// Endpoint to verify payment
app.get("/api/payment/verify/:reference", async (req, res) => {
  const reference = String(req.params.reference);
  //console.log('Received reference:', reference);
  const options = {
    method: "GET",
    url: `https://api.paystack.co/transaction/verify/${reference}`,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 
      "Content-Type": "application/json",
    },
  };  

  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(400).json({ error: "Paystack secret key is missing." });
    }
    const response = await axios(options);
    const data = response.data.data;
    //console.log('Payment verification data:', data);
    if (data && data.status) {
      const newCharity = new Charity({
        email,
        amount: amount / 100,
        reference,
        name,
        phone,
        date,
        time,
      });
      // console.log(phone);
      await newCharity.save();
      res.status(201).json({message: "Verified" });
      const emailContent = `
          Dear ${name},

          Thank you for your generous donation to The Entire Charity . 

          Your donation has been successfully processed, and your support will make a meaningful difference in the lives of those in need.

          Donation Details:
          - Amount: ₦${amount / 100}
          - Date: ${date}
          - Time: ${time}
        
          Your kindness and compassion are truly appreciated, and we are grateful for your commitment to our cause.

          With your help, we can continue to make a positive impact in the community.

          Thank you for making a difference!

          Best regards,
          The Entire Charity  Team,
          JAPA 
        `;

    // Send email to the user
    const mailOptions = {
      from: process.env.EMAIL_USER,  // Sender email (your Gmail)
      to: email,  // Recipient email (user's email)
      subject: 'Acknowledgement and gratitude',
      text: emailContent,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

      const encodedMessage = (
        `Dear ${name}, 

        Thank you for your generous contribution! 

        Donation details:
        - Reference: ${reference}
        - Amount: ₦${amount / 100}
        - Date: ${date}
        - Time: ${time}
              ${data}
        Your support makes a difference and helps us continue our work in improving lives. 

        We are truly grateful for your kindness and commitment to our cause. 

        Best regards, 
        The Entire Charity Team
        JAPA`
      );

      client.messages.create({
        body: encodedMessage,
        from: 'whatsapp:+14155238886',
        to: `whatsapp:${phone}`,
      })
      .then((message) => {
        console.log('Message sent:', message.sid);
      })
      .catch((error) => {
        console.error('Error sending WhatsApp message:', error.message);
      });

    } else {
      res.status(400).json({ error: "Payment not successful." });
    }
  } catch (error) {
    console.error(
      "Error verifying payment:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Payment verification failed." });
  }
});

app.listen(port, () => console.log(`Server is running on port ${port}.`));
