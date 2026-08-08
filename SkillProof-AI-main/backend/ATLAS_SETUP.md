Local MongoDB + MongoDB Compass setup for SkillProof backend

This project defaults to using a local MongoDB instance for development and works well with MongoDB Compass.

1. Install MongoDB Community Edition (Windows):
	- Using Chocolatey (recommended if available):
	  ```powershell
	  choco install mongodb -y
	  ```
	- Or download the installer: https://www.mongodb.com/try/download/community

2. Create the data directory and start `mongod` (keep this terminal open):
	```powershell
	mkdir C:\data\db
	mongod --dbpath C:\data\db
	```

3. Connect Compass to the local server:
	- Open MongoDB Compass and connect to: `mongodb://127.0.0.1:27017`
	- Select or create the `skillproof` database.

4. Confirm `backend/.env` uses the local URI (already set):
	```text
	MONGO_URI=mongodb://127.0.0.1:27017/skillproof
	```

5. Start the backend and seed an admin user (from the `backend` folder):
	```powershell
	npm install
	npm run start
	npm run seed-admin
	```

6. Manual seed via Compass (alternative):
	- Generate a bcrypt hash locally:
	  ```powershell
	  node -e "const bcrypt=require('bcryptjs'); bcrypt.hash('AdminPass123!',10).then(h=>console.log(h));"
	  ```
	- In Compass insert into `skillproof.users`:
	  {
		 "name": "Administrator",
		 "email": "admin@example.com",
		 "password": "<paste-hash>",
		 "role": "Recruiter"
	  }

After these steps the backend will use the local MongoDB which Compass can open. Restart the backend if you change `backend/.env`.
