# School Fee Payment Management System – Developed by ChatGPT

A responsive mini project built with **HTML, CSS, JavaScript, Node.js, Express.js and MySQL**.

## Features
- Dashboard with student count, total assigned fees, collected fees and pending balance.
- Add, list, search and delete student records.
- Assign academic-year and fee-type records to students.
- Record partial or full payments with payment date, method and receipt number.
- Prevent payments above the pending fee balance.
- Student-wise fee reports and print option.

## Database design correction
The supplied specification listed two tables named `Payments`, and the first payment table marked `payment_id` as a foreign key. The project combines the payment fields into one `Payments` table:
- `payment_id` is the primary key.
- `fee_id` is a foreign key referencing `Fee_Details`.
- The second duplicate Payments table is not created. Its `payment_status` field is included in the consolidated Payments table.
- `paracel_id` and `ammount` appear to be typing errors and are not used.

The project uses three related tables: `Students`, `Fee_Details`, and `Payments`.

## Requirements
- Node.js (LTS)
- MySQL Server
- Visual Studio Code (recommended)

## Setup in VS Code
1. Extract the ZIP file.
2. Open the extracted `School-Fee-Management-System-ChatGPT` folder in VS Code.
3. Start MySQL Server.
4. Open MySQL Workbench, open `database.sql`, and execute the script.
5. In the VS Code terminal, run:
   ```bash
   npm install
   ```
6. Copy `.env.example` to a new file named `.env`.
7. Edit `.env` and enter your MySQL password:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_actual_mysql_password
   DB_NAME=school_fee_db
   PORT=3000
   ```
8. Start the application:
   ```bash
   npm start
   ```
9. Open `http://localhost:3000` in your browser.

## GitHub upload
Create a new empty repository on GitHub, then run these commands in the project folder:
```bash
git init
git add .
git commit -m "Initial commit - School Fee Management System"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/school-fee-management-system-chatgpt.git
git push -u origin main
```
Replace `YOUR-USERNAME` with your GitHub username. Do not upload your `.env` file or MySQL password. `.gitignore` excludes `.env` and `node_modules`.

## Suggested project title
**School Fee Payment Management System – Developed by ChatGPT**
