import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Express app
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static( 'public'));

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Connect to MongoDB (using environment variable for production)
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/todoDB";
mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// Define Task Schema with priority
const taskSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 1
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create Task Model
const Task = mongoose.model("Task", taskSchema);

// Routes
// In your index.js route handler
app.get("/", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.render("index", { 
      tasks,
      getPriorityBadgeColor: (priority) => {
        const colors = {
          'low': 'info',
          'medium': 'primary',
          'high': 'warning',
          'urgent': 'danger'
        };
        return colors[priority] || 'secondary';
      }
    });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).render("error", { message: "Failed to load tasks" });
  }
});

app.post("/add", async (req, res) => {
  const { title, priority } = req.body;
  
  if (!title || title.trim().length === 0) {
    return res.redirect("/");
  }

  try {
    const newTask = new Task({
      title: title.trim(),
      priority: priority || 'medium'
    });
    await newTask.save();
    res.redirect("/");
  } catch (err) {
    console.error("Error adding task:", err);
    res.redirect("/");
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

app.post("/edit/:id", async (req, res) => {
  const { title, priority } = req.body;
  
  if (!title || title.trim().length === 0) {
    return res.redirect("/");
  }

  try {
    await Task.findByIdAndUpdate(
      req.params.id,
      { title: title.trim(), priority }
    );
    res.redirect("/");
  } catch (err) {
    console.error("Edit error:", err);
    res.redirect("/");
  }
});

app.get("/delete/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).render("error", { message: "Error deleting task" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", { message: "Something went wrong!" });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
