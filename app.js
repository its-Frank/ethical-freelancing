const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const mysql = require("mysql");
const path = require("path");
const { log, timeStamp } = require("console");
const app = express();

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "freelancing_schema",
});

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "cat",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000 },
  })
);

app.use((req, res, next) => {
  const protectedRoutes = [
    "/profile",
    "/apply",
    "/apply/:id",
    "/buyers",
    "/writers",
    "/messages",
    "/projects",
  ];
  // Check if the user is logged in
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    // Check if the user is a writer or a buyer
    if (
      req.session.user.role === "writer" &&
      protectedRoutes.includes(req.path) &&
      req.path.startsWith("/buyers")
    ) {
      // Redirect the writer to an error page or a different route
      return res.redirect("/error?message=restricted_access");
    } else if (
      req.session.user.role === "buyer" &&
      protectedRoutes.includes(req.path) &&
      req.path.startsWith("/writers")
    ) {
      // Redirect the buyer to an error page or a different route
      return res.redirect("/error?message=restricted_access");
    }
    next();
  } else if (protectedRoutes.includes(req.path)) {
    // Set redirectionhistorycookie cookie
    let path = req.path;
    if (Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString();
      path += `?${queryString}`;
    }
    res.cookie("redirectHistory", path, {
      maxAge: 1000 * 60 * 60 * 24, // Expires in 24 hours
      httpOnly: false, // Restricts access from client-side JavaScript
    });
    res.redirect("/login?message=login");
  } else {
    next();
  }
});
// User routes
app.get("/", (req, res) => {
  res.render("index");
});
app.get("/users", (req, res) => {
  const sql = "SELECT * FROM users";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render("user", { users: results });
  });
});
//writer
app.get("/writers", (req, res) => {
  const sql = 'SELECT * FROM users WHERE role = "writer"';
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render("writer", { users: results, req });
  });
});
// POST /writers (handles form submission)
app.post("/writers", (req, res) => {
  const { bio, experience_level, specialization, portfolio_url, hourly_rate } =
    req.body;
  const userId = req.session.user.id;
  // Check if profile exists
  const checkProfileQuery = `SELECT * FROM writer_profiles WHERE user_id = ?`;
  db.query(checkProfileQuery, [userId], (err, profileResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error checking profile");
    }
    if (profileResults.length > 0) {
      // Profile exists, update it
      const updateProfileQuery = `
        UPDATE writer_profiles
        SET bio = ?, experience_level = ?, specialization = ?, portfolio_url = ?, hourly_rate = ?
        WHERE user_id = ?
      `;
      db.query(
        updateProfileQuery,
        [
          bio,
          experience_level,
          specialization,
          portfolio_url,
          hourly_rate,
          userId,
        ],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Error updating profile");
          }
          // Set success message for update
          req.session.message = "Your profile has been successfully updated!";
        }
      );
    } else {
      // No profile, insert a new one
      const insertProfileQuery = `
        INSERT INTO writer_profiles (user_id, bio, experience_level, specialization, portfolio_url, hourly_rate)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      db.query(
        insertProfileQuery,
        [
          userId,
          bio,
          experience_level,
          specialization,
          portfolio_url,
          hourly_rate,
        ],
        (err, result) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Error creating profile");
          }
          // Set success message for insert
          req.session.message = "Your profile has been successfully created!";
        }
      );
    }

    res.render("writer-profiles.ejs", { req });
  });
});
//editing- writer-profile
app.get("/edit-writer-profile", (req, res) => {
  const userId = req.session.user.id;
  const selectProfileQuery = `SELECT * FROM writer_profiles WHERE user_id = ?`;
  db.query(selectProfileQuery, [userId], (err, profileResults) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error fetching profile");
    }
    if (profileResults.length === 0) {
      return res.redirect("/writers");
    }
    const profileData = profileResults[0];
    res.render("edit-writer-profile.ejs", { profileData });
  });
});
//updating the writer-profile
app.post("/update-writer-profile", (req, res) => {
  const { bio, experience_level, specialization, portfolio_url, hourly_rate } =
    req.body;
  const userId = req.session.user.id;
  const updateProfileQuery = `
    UPDATE writer_profiles
    SET bio = ?, experience_level = ?, specialization = ?, portfolio_url = ?, hourly_rate = ?
    WHERE user_id = ?
  `;
  db.query(
    updateProfileQuery,
    [bio, experience_level, specialization, portfolio_url, hourly_rate, userId],
    (err, result) => {
      if (err) {
        console.log(result);
        console.error(err);
        return res.status(500).send("Error updating profile");
      }
      // Update successful, redirect back to profile page
      req.session.message = "Your profile has been successfully updated!";
      res.redirect("/writer-profile");
    }
  );
});

app.get("/buyers", (req, res) => {
  // Fetch buyer data from database
  db.query("SELECT * FROM buyer_profiles", (err, results) => {
    if (err) {
      console.error(err);
      res.sendStatus(500);
    } else {
      res.render("buyer", { writers: results });
    }
  });
});
app.get("/buyers/search", (req, res) => {
  const { specialization, experience_level, available } = req.query;
  let sql = "SELECT users.*, writer_profiles.*";
  sql += " FROM users";
  sql += " INNER JOIN writer_profiles ON users.id = writer_profiles.user_id";
  sql += " WHERE role = 'writer'";
  const params = [];
  if (specialization) {
    sql += " AND specialization = ?";
    params.push(specialization);
  }
  if (experience_level && experience_level !== "") {
    sql += " AND experience_level = ?";
    params.push(experience_level);
  }
  if (available) {
    sql += " AND writer_profiles.available = true";
  }
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error fetching writers");
    }
    console.log(results);
    res.render("writer-results.ejs", { writers: results }); // Pass search results to the template
  });
});

// GET /writers/:writer_id (fetches specific writer details)
app.get("/writers/:writer_id", (req, res) => {
  const writerId = req.params.writer_id;
  const sql = `
    SELECT users.*, writer_profiles.*
    FROM users
    INNER JOIN writer_profiles ON users.id = writer_profiles.user_id
    WHERE users.id = ?
  `;
  db.query(sql, [writerId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error fetching writer details");
    }
    if (results.length === 0) {
      return res.status(404).send("Writer not found");
    }
    const writer = results[0];
    res.render("writer-profile.ejs", { writer });
  });
});
app.get("/buyer/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM users LEFT JOIN buyer_profiles ON users.id = buyer_profiles.user_id WHERE users.id = ${id}`;
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render("buyer", { user: results[0] });
  });
});
// Project routes
app.get("/projects", (req, res) => {
  db.query("SELECT * FROM projects  ORDER BY deadline DESC", (err, results) => {
    if (err) throw err;
    res.render("project", {
      projects: results,
    });
  });
});
//posting a project
app.post("/projects", (req, res) => {
  const {
    title,
    description,
    budget,
    specialization,
    experience_level,
    deadline,
    buyer_id,
  } = req.body;
  const query =
    "INSERT INTO projects (buyer_id, title, description, deadline, price_ksh_hour, status) VALUES (?, ?, ?, ?, ?, ?)";
  const values = [
    buyer_id,
    title,
    description,
    deadline,
    budget || null,
    "pending",
  ];
  db.query(query, values, (err, results, connection) => {
    if (err) {
      console.error(err);
      console.log(err);
      return res.status(500).send("Error creating project");
    }
    const projectId = results.insertId;
    if (connection) {
      connection.release();
    }
    console.log("Project details:", {
      title,
      description,
      deadline,
      budget,
      specialization,
      experience_level,
    });
    res.redirect("/projects?id=");
  });
});

// messages
app.get("/messages", (req, res) => {
  const sql = `SELECT sender_id,recipient_id,content, username,title,timestamp FROM messages JOIN users ON messages.sender_id = users.id JOIN projects ON messages.project_id = projects.id WHERE recipient_id ='${req.session.user.id}' ORDER BY timestamp DESC`;
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render("message", { messages: results });
  });
});

app.get("/messages/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT * FROM messages WHERE id = ${id}`;
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render("message", { message: results[0] });
  });
});
// //posting a message
// app.post("/message", (req, res) => {
//   const { senderId, recipientId, content, projectId } = req.body; // Destructure message data
//   // Validation (optional but recommended)
//   if (!senderId || !recipientId || !content || !projectId) {
//     return res.status(400).send("Missing required message data");
//   }
//   // Create the message object (adjust based on your database schema)
//   const message = {
//     sender_id: senderId,
//     recipient_id: recipientId,
//     content: content,
//     project_id: projectId,
//     timestamp: new Date(), // Set timestamp on server-side
//   };
//   // SQL query to insert message
//   const sql = `INSERT INTO messages (sender_id, recipient_id, content, project_id, timestamp) VALUES (?, ?, ?, ?, ?)`;
//   // Execute the query with prepared statement to prevent SQL injection
//   db.query(
//     sql,
//     [
//       message.sender_id,
//       message.recipient_id,
//       message.content,
//       message.project_id,
//       message.timestamp,
//     ],
//     (err, result) => {
//       if (err) throw err;
//       // Handle successful insertion
//       console.log(`Message sent successfully: ${message.id}`); // Assuming the database provides an ID
//       // Optional: Send success response or redirect (adjust as needed)
//       res.status(201).send("Message sent!"); // Or redirect to message thread page
//     }
//   );
// });

//signup
app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  if (req.body.password === req.body.confirm_pass) {
    db.query(
      `SELECT email FROM users WHERE email = "${req.body.email}"`,
      (sqlError, emailData) => {
        if (sqlError) {
          console.log("SQL error:", sqlError);
          res.status(500).render("register.ejs", {
            error: true,
            errMessage: "Server Error: Contact Admin if this persists.",
            prevInput: req.body,
          });
        } else {
          if (emailData.length > 0) {
            res.render("register.ejs", {
              error: true,
              errMessage:
                "Email Already Registered. Login with email and password!",
              prevInput: req.body,
            });
          } else {
            // Include user type and budget in the SQL statements
            let insertUserStatement = `
              INSERT INTO users(email, username, password, role)
              VALUES("${req.body.email}", "${
              req.body.username
            }", "${bcrypt.hashSync(req.body.password, 5)}", "${req.body.role}")
            `;
            db.query(insertUserStatement, (sqlErr) => {
              if (sqlErr) {
                res.status(500).render("register.ejs", {
                  error: true,
                  errMessage: "Server Error: Contact Admin if this persists.",
                  prevInput: req.body,
                });
              } else {
                res.status(304).redirect("/login?registerSuccess=true");
              }
            });
          }
        }
      }
    );
  } else {
    res.render("register.ejs", {
      error: true,
      errMessage: "Password and confirm password do not match!",
      prevInput: req.body,
    });
  }
});
//login
app.get("/login", (req, res) => {
  if (req.query.signupSuccess) {
    res.render("login.ejs", {
      message: "Register successful!! You can now log in.",
    });
  } else if (req.query.message) {
    res.render("login.ejs", { message: "Login to buy or get a writer." });
  } else {
    res.render("login.ejs");
  }
});
app.post("/login", (req, res) => {
  const loginStatement = `SELECT * FROM users WHERE email = '${req.body.email}'`;
  db.query(loginStatement, (sqlErr, userData) => {
    if (sqlErr) {
      console.log(sqlErr.message);
      res.status(500).render("login.ejs", {
        error: true,
        message: "Server Error, Contact Admin if this persists!",
        prevInput: req.body,
      });
    } else {
      console.log(userData);
      if (userData.length == 0) {
        res.status(401).render("login.ejs", {
          error: true,
          message: "Email or Password Invalid",
          prevInput: req.body,
        });
      } else {
        if (bcrypt.compareSync(req.body.password, userData[0].password)) {
          // create a session
          req.session.user = userData[0];
          // check if this was a redirection, we need to send them back to where they were.
          // check if there is a cookie-- redirect history-
          if (req.cookies.redirectHistory) {
            let redirectPath = req.cookies.redirectHistory;
            res.clearCookie("redirectHistory");
            res.redirect(redirectPath);
          } else {
            res.redirect("/");
          }
        } else {
          res.status(401).render("login.ejs", {
            error: true,
            message: "Email or Password Invalid",
            prevInput: req.body,
          });
        }
      }
    }
  });
});
//forum
app.get("/forum", (req, res) => {
  const sql = "SELECT * FROM forum_threads";
  db.query(sql, (err, results) => {
    if (err) throw err;
    res.render("thread", { threads: results });
  });
});
// posting a forum
app.post("/forum", (req, res) => {
  const { title, content, timestamp } = req.body;
  const user_id = req.session.user.id;
  if (!title || !content) {
    return res.status(400).send("Please fill in all required fields.");
  }
  const sql = `
    INSERT INTO forum_threads (user_id, title, content, timestamp)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [user_id, title, content, timestamp], (err, result) => {
    if (err) throw err;
    res.render("thread", { user_id, req });
  });
});

//apply
app.get("/apply/:id", (req, res) => {
  console.log(req.params.id);
  const selectSt = `SELECT * FROM projects WHERE id= ${req.params.id}`;
  db.query(selectSt, (err, data) => {
    if (err) {
      res.send("server error");
    } else {
      console.log(data[0]);
      res.render("apply.ejs", { project: data[0] });
    }
  });
});
//post apply
app.post("/apply/:id", (req, res) => {
  const userId = req.session.user.id;
  const { projectId, applicationText } = req.body;
  console.log(userId);
  console.log(applicationText);
  console.log(projectId);
  const checkAvailabilityQuery = `
    SELECT status FROM projects WHERE id = ?
  `;
  db.query(checkAvailabilityQuery, [projectId], (err, projectData) => {
    if (err) {
      console.log(err);
      return res.status(500).render("500.ejs", {
        message: "Server Error!! Contact admin if this persists.",
      });
    }
    if (projectData.length == 0) {
      // Project not found, handle error or redirect
      return res.status(404).send("Project not found!");
    }
    const projectStatus = projectData[0].status;
    if (projectStatus === "completed" || projectStatus === "cancelled") {
      // Project is not open for applications, redirect with message
      return res.redirect(`/project/${projectId}?message=closed`);
    }
    // Project is open for applications, proceed with application logic
    const insertApplication = `
      INSERT INTO applications (user_id, project_id, application_text, status)
      VALUES (?, ?, ?, 'pending')
    `;
    db.query(insertApplication, [userId, projectId, applicationText], (err) => {
      if (err) {
        console.log(err);
        return res.status(500).render("500.ejs", {
          message: "Server Error!! Contact admin if this persists.",
        });
      }
      res.redirect(`/profile`);
    });
  });
});

//error
app.get("/error", (req, res) => {
  const errorMessage = req.query.message || "An error occurred";
  res.render("error", { message: errorMessage });
});
//about
app.get("/about", (req, res) => {
  res.render("about");
});
//contact
app.get("/contact", (req, res) => {
  res.render("contact");
});
// profile
app.get("/profile", (req, res) => {
  const selectProjects = `SELECT * FROM applications WHERE user_id = '${req.session.user.id}'`;
  db.query(selectProjects, (selectErr, projects) => {
    if (selectErr) {
      console.log(selectErr);
      res.status(500).render("500.ejs", {
        message: "Server Error!! Contact admin if this persists.",
      });
    } else {
      res.render("profile.ejs", { projects: projects });
    }
  });
});
//checkout
app.get("/checkout", (req, res) => {
  const projectId = Number(req.params.id);
  const userId = req.session.user.id;
  // Check project existence and user application
  const checkApplicationQuery = `
    SELECT * FROM applications
    WHERE project_id = ? AND user_id = ? 
  `;
  db.query(checkApplicationQuery, [projectId, userId], (err, applications) => {
    if (err) {
      console.log(err);
      return res.status(500).render("500.ejs", {
        message: "Server Error!! Contact admin if this persists.",
      });
    }
    if (!applications.length) {
      // No application found for this project and user, redirect with message
      return res.redirect(`/project/${projectId}?message=no_application`);
    }
    const application = applications[0]; // Assuming only one application per project-user
    // Check application status (optional)
    if (application.status !== "pending") {
      // Application is not in a pending state, redirect with message
      return res.redirect(
        `/project/${projectId}?message=application_${application.status}`
      ); // Adjust message based on status
    }
    // Update application status (assuming checkout marks it as approved)
    const updateApplication = `
      UPDATE applications
      SET status = 'approved'
      WHERE application_id = ?
    `;
    db.query(updateApplication, [application.application_id], (updateErr) => {
      if (updateErr) {
        console.log(updateErr);
        return res.status(500).render("500.ejs", {
          message: "Server Error!! Contact admin if this persists.",
        });
      }
      // Successful checkout, redirect with message
      res.redirect("/profile");
    });
  });
});

//logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});
//writing-editing
app.get("/writing-editing", (req, res) => {
  res.render("writing-editing.ejs");
});
//web-design & development
app.get("/web-design", (req, res) => {
  res.render("web-design.ejs");
});
//marketing-media
app.get("/marketing-media", (req, res) => {
  res.render("marketing-media.ejs");
});
//graphic-videoediting
app.get("/graphic-videoediting", (req, res) => {
  res.render("graphic-videoedit.ejs");
});
//other-freelancingservices
app.get("/other-freelancingservices", (req, res) => {
  res.render("other-freelservices.ejs");
});
//freelancing tips
app.get("/freelancing-tips", (req, res) => {
  res.render("tips-freelancers.ejs");
});
//high-paying-jobs
app.get("/high-paying-jobs", (req, res) => {
  res.render("high-payingjobs.ejs");
});
//freelancing tools
app.get("/freelancing-tools", (req, res) => {
  res.render("freelancingtools.ejs");
});
//not found page
app.get("*", (req, res) => {
  res.render("404.ejs");
});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
