# PC Points Attendance System

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Import members from CSV:**
   ```bash
   npm run import:csv
   ```
   This imports all members from `Fall 25 Active Directory-Grid view.csv` with:
   - Username = NetID
   - Password = `pctattendance` (must be changed on first login)
   - Role = Standard Permissions (level 0)

3. **Create VP Communications account:**
   ```bash
   npm run seed:vpcomms
   ```
   This creates the VP Communications account:
   - Email: `pct.vpcommunications@gmail.com`
   - Password: `hannahisverypretty`
   - Username: `vpcomm`
   - Role: Exec Permissions (level 2)

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Access the app:**
   Open `http://localhost:3000` in your browser.

## Permission Levels

- **Standard Permissions (Level 0)**: View own points only
- **Leadership Permissions (Level 1)**: Can take attendance for all members
- **Exec Permissions (Level 2)**: Can add members, view all points, reset semester

## Login

- Members: Use NetID/username + password `pctattendance` (change on first login)
- VP Communications: Use email `pct.vpcommunications@gmail.com` + password `hannahisverypretty`
