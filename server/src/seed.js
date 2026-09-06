require("dotenv").config({ path: __dirname + '/../.env' });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("./models/User");
const StudentProfile = require("./models/StudentProfile");
const EmployerProfile = require("./models/EmployerProfile");
const Listing = require("./models/Listing");
const Application = require("./models/Application");
const Notification = require("./models/Notification");
const Report = require("./models/Report");
const SavedListing = require("./models/SavedListing");

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // Clear existing data
    await User.deleteMany();
    await StudentProfile.deleteMany();
    await EmployerProfile.deleteMany();
    await Listing.deleteMany();
    await Application.deleteMany();
    await Notification.deleteMany();
    await Report.deleteMany();
    await SavedListing.deleteMany();
    console.log("Cleared existing data...");

    const salt = await bcrypt.genSalt(12);
    const defaultPassword = await bcrypt.hash("Password123!", salt);

    // 1. Admin
    const admin = new User({
      email: "admin@internsync.dev",
      passwordHash: defaultPassword,
      role: "ADMIN",
      isEmailVerified: true
    });
    await admin.save();
    console.log("Created Admin...");

    // 2. Approved Employers (3)
    const approvedEmployers = [];
    for (let i = 1; i <= 3; i++) {
      const empUser = new User({
        email: `employer${i}@example.com`,
        passwordHash: defaultPassword,
        role: "EMPLOYER",
        isEmailVerified: true
      });
      await empUser.save();

      const empProfile = new EmployerProfile({
        user: empUser._id,
        companyName: `Tech Corp ${i}`,
        industry: "Technology",
        verificationStatus: "APPROVED"
      });
      await empProfile.save();
      approvedEmployers.push(empProfile);
    }
    console.log("Created Approved Employers...");

    // 3. Pending Employer (1)
    const pendingEmpUser = new User({
      email: `pendingemployer@example.com`,
      passwordHash: defaultPassword,
      role: "EMPLOYER",
      isEmailVerified: true
    });
    await pendingEmpUser.save();

    const pendingEmpProfile = new EmployerProfile({
      user: pendingEmpUser._id,
      companyName: `Startup Sandbox`,
      industry: "Startups",
      verificationStatus: "PENDING"
    });
    await pendingEmpProfile.save();
    console.log("Created Pending Employer...");

    // 4. Create Listings for Approved Employers (2-3 each)
    const allListings = [];
    for (let i = 0; i < approvedEmployers.length; i++) {
      const emp = approvedEmployers[i];
      for (let j = 1; j <= 2; j++) {
        const listing = new Listing({
          employer: emp._id,
          title: `Software Engineer Intern ${i + 1}-${j}`,
          type: "INTERNSHIP",
          description: "A great internship opportunity to learn modern web development.",
          workMode: "REMOTE",
          stipendOrSalaryMin: 1000,
          stipendOrSalaryMax: 2000,
          status: "ACTIVE"
        });
        await listing.save();
        allListings.push(listing);
      }
    }

    // 5. Create Pending Listing for Pending Employer
    const pendingListing = new Listing({
      employer: pendingEmpProfile._id,
      title: `Marketing Intern`,
      type: "INTERNSHIP",
      description: "Help us market our new startup.",
      workMode: "ONSITE",
      status: "PENDING_REVIEW"
    });
    await pendingListing.save();
    console.log("Created Listings...");

    // 6. Create Students (10)
    const students = [];
    for (let i = 1; i <= 10; i++) {
      const studentUser = new User({
        email: `student${i}@example.com`,
        passwordHash: defaultPassword,
        role: "STUDENT",
        isEmailVerified: true
      });
      await studentUser.save();

      const studentProfile = new StudentProfile({
        user: studentUser._id,
        fullName: `Student Name ${i}`,
        college: "University of Technology",
        resumeUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg" // dummy URL
      });
      await studentProfile.save();
      students.push(studentUser); 
    }
    console.log("Created Students...");

    // 7. Create Applications
    const statuses = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "REJECTED"];
    for (let i = 0; i < 5; i++) {
      const student = students[i];
      const listing = allListings[i % allListings.length];
      
      const app = new Application({
        listing: listing._id,
        student: student._id,
        status: statuses[i % statuses.length],
        statusHistory: [{ status: statuses[i % statuses.length], date: new Date() }]
      });
      await app.save();
    }
    console.log("Created Applications...");

    console.log("===================================");
    console.log("Database seeded successfully!");
    console.log("Test Login: admin@internsync.dev / Password123!");
    console.log("===================================");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedDatabase();
