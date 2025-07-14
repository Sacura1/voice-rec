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
import connectPgSimple from 'connect-pg-simple';

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
    'https://voice-rec-frontend.onrender.com',
    'https://voice-rec-front.onrender.com',
    'http://localhost:10000',
    'http://localhost:3000'
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

const port = process.env.PORT || 3000;
const saltRounds = 10;
env.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors(corsOptions));

app.set('trust proxy', 1);

const pgSession = connectPgSimple(session);

app.use(
  session({
    store: new pgSession({
      pool: db,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET is not defined"); })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 
    }
  })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(passport.initialize());
app.use(passport.session());

const requireAuth = (req: Request, res: Response, next: NextFunction): any => {
  console.log("Auth middleware - isAuthenticated:", req.isAuthenticated());
  console.log("Auth middleware - session ID:", req.sessionID);
  console.log("Auth middleware - user:", req.user?.username);
  
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized: Please log in" });
  }
  next();
};

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

app.post("/register", async (req: Request, res: Response): Promise<any> => {
  const { email, password, username } = req.body;
  
  console.log("Registration attempt:", { email, username });
  
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
      if (err) {
        console.error("Auto-login error:", err);
        return res.status(500).json({ error: "Registration successful but login failed" });
      }
      
      console.log("User registered and logged in:", user.username);
      console.log("Session ID after registration:", req.sessionID);
      
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
  console.log("User logged in:", req.user?.username);
  console.log("Session ID after login:", req.sessionID);
  
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

    console.log("Uploading recording for user:", username);

    const fileBuffer = await fs.promises.readFile(req.file.path);

    await fs.promises.unlink(req.file.path);

    await db.query(
      `INSERT INTO recordings(username, audio, created_at) VALUES ($1, $2, $3)`,
      [username, fileBuffer, timestamp]
    );

    res.status(200).json({ message: "Successfully uploaded!" });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload audio" });
  }
});

app.get("/recordings", requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const username = req.user!.username.toLowerCase();

    console.log("Fetching recordings for user:", username);

    const result = await db.query(
      `SELECT audio, created_at FROM recordings WHERE username = $1 ORDER BY created_at DESC`,
      [username]
    );

    const recordings = result.rows.map(recording => ({
      audio: recording.audio.toString("base64"),
      created_at: recording.created_at,
    }));

    console.log(`Found ${recordings.length} recordings for user:`, username);
    res.json({ recordings });
  } catch (error) {
    console.error("Get recordings error:", error);
    res.status(500).json({ error: "Failed to get recordings" });
  }
});

app.get("/auth/status", (req: Request, res: Response) => {
  console.log("Auth status check - isAuthenticated:", req.isAuthenticated());
  console.log("Session ID:", req.sessionID);
  console.log("User:", req.user?.username);
  
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

app.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logout successful" });
    });
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
  console.log("Serializing user:", user.username);
  done(null, user.id); 
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await db.query("SELECT id, email, username FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      console.log("User not found during deserialization:", id);
      return done(null, false);
    }
    console.log("Deserializing user:", result.rows[0].username);
    done(null, result.rows[0]); 
  } catch (err) {
    console.error("Deserialization error:", err);
    done(err);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});