import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
//import dotenv from 'dotenv';

// Initialize configuration
//dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Database Connection
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/todoDB";
let dbConnected = false;

async function connectDB() {
  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    dbConnected = true;
    console.log("Successfully connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit if DB connection fails
  }
}

// Define Task Schema
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create Task Model
const Task = mongoose.model("Task", taskSchema);

// Middleware to check DB connection
app.use(async (req, res, next) => {
  if (!dbConnected) {
    try {
      await connectDB();
      next();
    } catch (err) {
      res.status(503).render("error", {
        message: "Service unavailable. Database connection failed.",
      });
    }
  } else {
    next();
  }
});

// Routes
app.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.render("index", {
      tasks,
      getPriorityBadgeColor: (priority) => {
        const colors = {
          low: "info",
          medium: "primary",
          high: "warning",
          urgent: "danger",
        };
        return colors[priority] || "secondary";
      },
    });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).render("error", { message: "Failed to load tasks" });
  }
});

app.post("/add", async (req, res) => {
  const { title, priority } = req.body;

  if (!title?.trim()) {
    return res.redirect("/");
  }

  try {
    const newTask = new Task({
      title: title.trim(),
      priority: priority || "medium",
    });
    await newTask.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error adding task:", err);
    res.status(500).redirect("/");
  }
});

app.get("/edit/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).render("error", { message: "Task not found" });
    }
    res.render("edit", { task });
  } catch (err) {
    console.error("Edit page error:", err);
    res.status(500).render("error", { message: "Error loading edit page" });
  }
});

// Changed from POST to PUT
app.put("/tasks/:id", async (req, res) => {
  const { title, priority } = req.body;

  if (!title?.trim()) {
    return res.redirect("/");
  }

  try {
    await Task.findByIdAndUpdate(
      req.params.id,
      { title: title.trim(), priority },
      { new: true }
    );
    res.redirect("/");
  } catch (err) {
    console.error("Edit error:", err);
    res.status(500).redirect("/");
  }
});

// Changed from GET to DELETE
app.delete("/tasks/:id", async (req, res) => {
  try {
    const result = await Task.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).render("error", { message: "Task not found" });
    }
    res.redirect("/");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).render("error", { message: "Error deleting task" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server only after DB connection
async function startServer() {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
