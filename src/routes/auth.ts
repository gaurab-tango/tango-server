import express from 'express';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dbConnect from '../utils/db';

const router = express.Router();

router.post('/userLogin', async (req, res): Promise<any> => {
  try {
    await dbConnect();
    const { username, password } = req.body;

    const currentUser = await User.findOne({ username });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, currentUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password!" });
    }

    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET_USER as string,
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, currentUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/adminLogin', async (req, res): Promise<any> => {
  try {
    await dbConnect();
    const { username, password } = req.body;

    const currentUser = await User.findOne({ username });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!currentUser.isAdmin) {
      return res.status(401).json({ message: "User not Authorized!" });
    }

    const isMatch = await bcrypt.compare(password, currentUser.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password!" });
    }

    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET_ADMIN as string,
      { expiresIn: '30d' }
    );

    res.status(201).json({ token, currentUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/userSignup', async (req, res): Promise<any> => {
  try {
    await dbConnect();
    const { username, name, password, designation, isAdmin, adminpassword } = req.body;

    if (adminpassword !== process.env.SIGNUP_ADMIN_PASSWORD) {
      return res.status(400).json({ message: "Wrong admin password" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, name, password: hashedPassword, designation, isAdmin });
    await user.save();

    res.status(201).json({ message: "User created successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating user' });
  }
});

export default router;
