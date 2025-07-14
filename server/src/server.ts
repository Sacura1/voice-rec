import cors from 'cors'
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pkg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
const __dirname = path.resolve();
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      username: string;
      password: string;
    }
  }
}

const app = express();
const { Pool } = pkg;

dotenv.config()

const corsOptions = {
  origin: [
    'https://voice-rec-frontend.onrender.com'
    
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

const port = 3000
const saltRounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET is not defined"); })(),
    resave: false,
    saveUninitialized: true,
    cookie:{
      secure:true,
      sameSite:'none'
    }
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(passport.initialize());
app.use(passport.session());

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
db.connect();

const uploadsDir = path.join(__dirname, 'uploads/recordings');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const userDir = path.join(uploadsDir, `user_${userId}`);
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname || 'recording';
    const extension = path.extname(originalName) || '.webm';
    cb(null, `recording_${timestamp}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});


app.post("/register", async (req: Request, res: Response) : Promise<any> => {
  const { email, password, username } = req.body;
  
  console.log(req.body);
  
  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (checkResult.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const result = await db.query(
      "INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id, email, username",
      [email, hashedPassword, username]
    );
    
    const user = result.rows[0];
    
    req.login(user, (err) => {
      console.log("logged in ")
      if (err) {
        console.error("Auto-login error:", err);
        return res.status(500).json({ error: "Registration successful but login failed" });
      }
      
      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        }
      });
    });
    
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", passport.authenticate("local", {
  failureMessage: true
}), (req: Request, res: Response) => {
  res.json({
    message: "Login successful",
    user: {
      id: req.user!.id,
      email: req.user!.email,
      username: req.user!.username
    }
  });
});


app.post("/upload-recording", upload.single('audio'), async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const { duration, timestamp } = req.body;
    const username = req.body.username.toLowerCase();

    const fileBuffer = await fs.promises.readFile(req.file.path);

    await fs.promises.unlink(req.file.path);

    await db.query(
      `INSERT INTO recordings(username, audio, created_at) VALUES ($1, $2, $3)`,
      [username, fileBuffer, timestamp]
    );

    res.status(200).json("Successfully Sent!");
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload audio" });
  }
});

app.get("/recordings", async (req: Request, res: Response): Promise<any> => {
  try {
    const username = req.user?.username?.toLowerCase();

    if (!username) {
      return res.status(401).json({ error: "Unauthorized: no username found" });
    }

    const result = await db.query(
      `SELECT audio, created_at FROM recordings WHERE username = $1 ORDER BY created_at DESC`,
      [username]
    );

    const recordings = result.rows.map(recording => ({
      audio: recording.audio.toString("base64"),
      created_at: recording.created_at,
    }));

    res.json({ recordings });
  } catch (error) {
    console.error("Get recordings error:", error);
    res.status(500).json({ error: "Failed to get recordings" });
  }
});



app.get("/auth/status", (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user!.id,
        email: req.user!.email,
        username: req.user!.username
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.get("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.json({ message: "Logout successful" });
  });
});

passport.use(
  "local",
  new Strategy({usernameField:'email'}, async function verify(email, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        email,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb(null, false);
      }
    } catch (err) {
      console.log(err);
      return cb(err);
    }
  })
);

passport.serializeUser((user: Express.User, done) => {
  done(null, user.id); 
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await db.query("SELECT id, email, username FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return done(null, false);
    done(null, result.rows[0]); 
  } catch (err) {
    done(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});