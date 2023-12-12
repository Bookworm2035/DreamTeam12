//This is our Node Index
//Authors Natali, Nya, Hayden, Tyler Section 04
//Set variables for apps 
const session = require("express-session");
const express = require("express");
let app = express();

//store username & passwords to local storage
app.use(session({
   secret: "dreamteam",
   resave: false,
   saveUninitialized: true
}));
app.use(express.json());
let path = require('path');

//dynamic port
const port = process.env.PORT || 3000;

//no more html 
app.set("view engine", "ejs");

// this lets you pharse stuff from stuff??? the freak 
app.use(express.urlencoded({extended:true}));

//DO this when you have a database :) 
const knex = require("knex")({
   client: "pg",
   connection: {
      host:
         process.env.DB_ENDPOINT || 
         "awseb-e-pib2957zu6-stack-awsebrdsdatabase-epobgxcfn9yl.clg8l9gauvu4.us-east-2.rds.amazonaws.com",
   user: process.env.RDS_USERNAME || "postgres",
   password: process.env.RDS_PASSWORD || "tdogtyler14",
   database: process.env.RDS_DB_NAME || "YDesserts",
   port: process.env.RDS_PORT || 5432,
   ssl: process.env.DB_SSL ? {rejectUnauthorized: false}: false 
}
})

//get views
app.set('views', path.join(__dirname,'./views'));

//this pulls in the website page static content
app.use(express.static(path.join(__dirname,'./static')));

//index page
app.get('/', (req, res) => {
   req.session.username = null;
   res.render('index');
});

//login page
app.get("/login", (req, res) => {
   res.render("login");
});

// Survey
app.get("/survey", (req, res) => {
   res.render("survey")
});

//error page if login fails
app.get("/error", (req, res) => {
   res.render("error");
});

//home page for users logged in
app.get("/indexUser", (req, res) => {
   const username = req.session.username;
   if (!username) {
      // Redirect to the login page if username is not available
      res.redirect("/login");
   } else {
      // Render the indexUser page with the username
      res.render("indexUser", { username: username });
   }
});

//logout page
app.get("/logout", (req, res) => {
   res.render("logout");
})

//login page that authenticates
app.post("/login", (req, res) => {
   const { username, password } =req.body
    knex("users")
        .where({ username, password })
        .first()
        .then(user => {
        if (user) {
            // Pass the username to the indexUser view
            req.session.username = username;
            // Redirect to the indexUser page
            res.redirect("/indexUser");
        } else {
            // Redirect to an error page
            res.redirect("/error");
        }
        })
        .catch(err => {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
        });
});


// Display all the users only if logged in
app.get("/displayRow", (req, res)=> {
   const username= req.session.username;
    knex.select().from("rows").then(users => {
      res.render("displayRow", {myUser: users, username: username});
   })
})

// Displaying database
app.get("/database", (req, res) => {
   const username= req.session.username; 
   knex.select().from("persons").then(myPersons => {
      res.render("database", {allPersons: myPersons, username: username})
   }).catch(error => {
      console.error('Error fetching all persons:', error);
      res.status(500).send('Error fetching all persons');
   });
});

// Site to add user to users
app.get("/addRow", (req, res) => {
   const username= req.session.username;
    res.render("addRow", { username: username });
})

// Adding to the users table
app.post("/addRow", (req, res)=> {
    knex("users").insert({
      username: req.body.username,
      password: req.body.password
   }).then(myUser => {
      res.redirect("/");
   })
});

//editing the users DISPLAY if logged in
app.get("/editRow/:id", (req, res)=> {
   const username= req.session.username;
    knex.select("user_id",
      "username",
      "password").from("users").where("user_id", req.params.id).then(User => {
    res.render("editUser", {myUser: User, username: username});
   }).catch( err => {
      console.log(err);
      res.status(500).json({err});
   });
});

//editing the users DISPLAY if logged in
app.post("/editRow", (req, res)=> {
   knex("users").where("user_id", parseInt(req.body.user_id)).update({
      username: req.body.username,
      password: req.body.password
   }).then(myUser => {
      res.redirect("/");
   })
});

//deleting users (if logged in)
app.post("/deleteRow/:id", (req, res) => {
   knex("users").where("user_id",req.params.id).del().then( myUser => {
      res.redirect("/");
   }).catch( err => {
      console.log(err);
      res.status(500).json({err});
   });
});

//submiting the survey
app.post("/submitsurvey", async (req, res) => {
   const hardcodedorigin = "Provo";
   const selectedPlatforms = req.body.PlatformID;
   try {
      const surveyId = await knex("persons")
         .insert({
            Age: req.body.Age,
            Gender:req.body.Gender,
            RelationshipStatus:req.body.RelationshipStatus,
            OccupationStatus: req.body.OccupationStatus,
            UniversityAffiliation: req.body.UniversityAffiliation,
            SchoolAffiliation: req.body.SchoolAffiliation,
            CompanyAffiliation: req.body.CompanyAffiliation,
            GovernmentAffiliation: req.body.GovernmentAffiliation,
            PrivateAffiliation: req.body.PrivateAffiliation,
            SocialMediaUser: req.body.SocialMediaUser,
            UsageID: req.body.UsageID,
            Q1: req.body.Q1,
            Q2: req.body.Q2,
            Q3: req.body.Q3,
            Q4: req.body.Q4,
            Q5: req.body.Q5,
            Q6: req.body.Q6,
            Q7: req.body.Q7,
            Q8: req.body.Q8,
            Q9: req.body.Q9,
            Q10: req.body.Q10,
            Q11: req.body.Q11,
            Q12: req.body.Q12,
            Origin: hardcodedorigin
         })
         .returning('PersonID');
      console.log(surveyId);
      const platformInsertPromises = selectedPlatforms.map(platform => {
         return knex("records").insert({
            Date: knex.raw('CURRENT_TIMESTAMP'),
            Time: knex.raw('CURRENT_TIMESTAMP'),
            OccupationStatus: req.body.OccupationStatus,
            PlatformID: platform,
            PersonID: surveyId[0].PersonID,
         });
      });
      await Promise.all(platformInsertPromises);
      res.redirect("/");
   } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Error submitting survey.');
   }
});

 //listen at the end
app.listen(port,() => console.log("I am listening"));