import express, { Request, Response } from "express";
import "dotenv/config";
import cors from "cors";

import dailyReportRoutes from "./routes/dailyReport";

import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import verifyToken from "./middleware/verifyToken";
import dbConnect from "./utils/db";

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.send("server working!");
});
app.use("/auth", authRoutes);
app.use("/user", verifyToken("user"), dailyReportRoutes);

app.use("/admin", verifyToken("admin"), adminRoutes);

// Start server on Render
const PORT = process.env.PORT || 3500;
dbConnect().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}).catch((err) => {
  console.error("❌ Failed to connect to DB:", err);
});

// Vercel handler
// export default async function handler(req: Request, res: Response) {
//   if (!isConnected) {
//     await dbConnect();
//     isConnected = true;
//   }

//   return app(req, res);
// }
