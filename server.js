require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "school_fee_db",
  waitForConnections: true,
  connectionLimit: 10
});

const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Check the database independently from the browser UI.
app.get("/api/health", asyncRoute(async (req, res) => {
  const [[row]] = await pool.query("SELECT 1 AS mysql_connected, DATABASE() AS database_name");
  res.json({ server: "running", mysql: "connected", database: row.database_name });
}));

app.get("/api/dashboard", asyncRoute(async (req, res) => {
  const [[students]] = await pool.query("SELECT COUNT(*) AS total FROM Students");
  const [[fees]] = await pool.query("SELECT COALESCE(SUM(total_amount),0) AS total FROM Fee_Details");
  const [[paid]] = await pool.query("SELECT COALESCE(SUM(amount_paid),0) AS total FROM Payments");
  const [[pending]] = await pool.query(`
    SELECT COALESCE(SUM(GREATEST(f.total_amount - COALESCE(p.paid,0),0)),0) AS total
    FROM Fee_Details f
    LEFT JOIN (SELECT fee_id, SUM(amount_paid) paid FROM Payments GROUP BY fee_id) p
    ON p.fee_id=f.fee_id
  `);
  res.json({ students: students.total, assigned: fees.total, collected: paid.total, pending: pending.total });
}));

app.get("/api/students", asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM Students ORDER BY student_id DESC");
  res.json(rows);
}));

app.post("/api/students", asyncRoute(async (req, res) => {
  const { name, class: studentClass, roll_no, phone, email } = req.body;
  if (!name || !studentClass || !roll_no) return res.status(400).json({ error: "Name, class and roll number are required." });
  const [result] = await pool.execute(
    "INSERT INTO Students(name,class,roll_no,phone,email) VALUES(?,?,?,?,?)",
    [name, studentClass, roll_no, phone || null, email || null]
  );
  res.status(201).json({ message: "Student added.", student_id: result.insertId });
}));

app.delete("/api/students/:id", asyncRoute(async (req, res) => {
  const [result] = await pool.execute("DELETE FROM Students WHERE student_id=?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: "Student not found." });
  res.json({ message: "Student deleted." });
}));

app.get("/api/fees", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT f.*, s.name, s.class, s.roll_no,
      COALESCE(SUM(p.amount_paid),0) AS paid_amount,
      GREATEST(f.total_amount-COALESCE(SUM(p.amount_paid),0),0) AS pending_amount
    FROM Fee_Details f JOIN Students s ON s.student_id=f.student_id
    LEFT JOIN Payments p ON p.fee_id=f.fee_id
    GROUP BY f.fee_id ORDER BY f.fee_id DESC
  `);
  res.json(rows);
}));

app.post("/api/fees", asyncRoute(async (req, res) => {
  const { student_id, academic_year, fee_type, total_amount, due_date } = req.body;
  if (!student_id || !academic_year || !fee_type || Number(total_amount) <= 0)
    return res.status(400).json({ error: "Enter student, academic year, fee type and a valid amount." });
  const [result] = await pool.execute(
    "INSERT INTO Fee_Details(student_id,academic_year,fee_type,total_amount,due_date) VALUES(?,?,?,?,?)",
    [student_id, academic_year, fee_type, total_amount, due_date || null]
  );
  res.status(201).json({ message: "Fee assigned.", fee_id: result.insertId });
}));

app.post("/api/payments", asyncRoute(async (req, res) => {
  const { fee_id, amount_paid, payment_date, payment_method } = req.body;
  if (!fee_id || Number(amount_paid) <= 0 || !payment_date || !payment_method)
    return res.status(400).json({ error: "Enter fee, amount, date and payment method." });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[fee]] = await conn.execute("SELECT total_amount FROM Fee_Details WHERE fee_id=? FOR UPDATE", [fee_id]);
    if (!fee) { await conn.rollback(); return res.status(404).json({ error: "Fee record not found." }); }
    const [[paid]] = await conn.execute("SELECT COALESCE(SUM(amount_paid),0) AS total FROM Payments WHERE fee_id=?", [fee_id]);
    const balance = Number(fee.total_amount) - Number(paid.total);
    if (Number(amount_paid) > balance) {
      await conn.rollback();
      return res.status(400).json({ error: `Payment exceeds pending balance of ${balance.toFixed(2)}.` });
    }
    const receipt = "SFP-" + Date.now();
    const [result] = await conn.execute(
      "INSERT INTO Payments(fee_id,amount_paid,payment_date,payment_method,receipt_no,payment_status) VALUES(?,?,?,?,?,'Paid')",
      [fee_id, amount_paid, payment_date, payment_method, receipt]
    );
    await conn.commit();
    res.status(201).json({ message: "Payment recorded.", payment_id: result.insertId, receipt_no: receipt });
  } catch (e) {
    await conn.rollback(); throw e;
  } finally { conn.release(); }
}));

app.get("/api/payments", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.*, s.name, s.class, s.roll_no, f.fee_type, f.academic_year
    FROM Payments p JOIN Fee_Details f ON f.fee_id=p.fee_id
    JOIN Students s ON s.student_id=f.student_id
    ORDER BY p.payment_id DESC
  `);
  res.json(rows);
}));

app.get("/api/reports", asyncRoute(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT s.student_id, s.name, s.class, s.roll_no,
      SUM(f.total_amount) AS total_fee,
      COALESCE(SUM(x.paid),0) AS paid_amount,
      SUM(f.total_amount)-COALESCE(SUM(x.paid),0) AS pending_amount
    FROM Students s JOIN Fee_Details f ON f.student_id=s.student_id
    LEFT JOIN (SELECT fee_id, SUM(amount_paid) paid FROM Payments GROUP BY fee_id) x ON x.fee_id=f.fee_id
    GROUP BY s.student_id ORDER BY s.name
  `);
  res.json(rows);
}));

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "That roll number already exists in this class, or the value must be unique." });
  res.status(500).json({ error: "Server error. Check MySQL connection and server terminal." });
});

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`School Fee Management System running at http://localhost:${port}`);
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`MySQL connected: ${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || 3306} / ${process.env.DB_NAME || "school_fee_db"}`);
  } catch (err) {
    console.error("MySQL connection failed:", err.code || err.message);
    console.error("Check that MySQL Server is running, port 3306 is listening, and .env credentials/database are correct.");
  }
});
