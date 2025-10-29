import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export default function verifyToken(client: "admin" | "user") {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      let secret: string;

      if (client === "admin") {
        secret = process.env.JWT_SECRET_ADMIN as any;
      } else if (client === "user") {
        secret = process.env.JWT_SECRET_USER as any;
      } else {
        res.status(400).send("Invalid client type.");
        return;
      }

      const authHeader = req.headers["authorization"];
      const token = authHeader?.replace("Bearer ", "");

      if (!token) {
        res.status(401).send("Access denied. No token provided.");
        return;
      }

      try {
        // Optionally store decoded token if needed:
        // const decoded = jwt.verify(token, secret) as JwtPayload;
        jwt.verify(token, secret);
        next();
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          res.status(401).send("Token expired.");
        } else {
          res.status(401).send("Access denied. Invalid token.");
        }
      }
    } catch (error) {
      console.error("JWT Verification Error:", error);
      res.status(500).send("Internal server error.");
    }
  };
}
