//This is our Node Index
//Authors Natali, Nya, Hayden, Tyler Section 04
//Set variables for apps 
const session = require("express-session");
const express = require("express");
//const { checkIfDataExists } = require('./dataOperations');
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
   host: process.env.DB_ENDPOINT || "awseb-e-pethmva2r2-stack-awsebrdsdatabase-faxzs71hlv7s.c4jbkoudgg97.us-east-2.rds.amazonaws.com",
   user: process.env.RDS_USERNAME || "postgres",
   password: process.env.RDS_PASSWORD || "happyfeet",
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

//login page that authenticates
app.post("/login", (req, res) => {
   const { username, password } = req.body
    knex("Login")
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

// Displaying database
app.get("/database", (req, res) => {
   const username= req.session.username; 
   knex.select().from("Review").then(myReview => {
      res.render("database", {allReviews: myReview, username: username})
   }).catch(error => {
      console.error('Error fetching all persons:', error);
      res.status(500).send('Error fetching all persons');
   });
});



app.get("/reviewDetails/:reviewID", async (req, res) => {
   try {
      // Retrieve review details based on the reviewID from the URL parameter
      const reviewID = req.params.reviewID;
      const reviewDetails = await knex.select('ReviewID','RestName', 'StreetAddress', 'FirstName', 'DessertName', 'Description', 'Stars', 'Price', 'DairyFree', 'GlutenFree')
      .from('Review')
      .join('User as U', 'Review.UserID', '=','U.UserID')
      .join('Restaurant as R', 'Review.RestaurantID', '=','R.RestaurantID')
      .join('Dessert as D', 'Review.DessertID', '=','D.DessertID')
      .where({ ReviewID: reviewID }).first();

      // Render the reviewDetails.ejs template with the retrieved details
      res.render("reviewDetails", { reviewDetails });
   } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Error retrieving review details.');
   }
});


// Displaying database
app.get("/indexDatabase", (req, res) => {
   const username= req.session.username; 
   knex.select().from("Review").then(myReview => {
      res.render("indexDatabase", {allReviews: myReview, username: username})
   }).catch(error => {
      console.error('Error fetching all persons:', error);
      res.status(500).send('Error fetching all persons');
   });
});

// Site to add user to users
app.get("/addUser", (req, res) => {
  const username= req.session.username;
  res.render("addUser", { username: username });
})

//Adding to the users table
app.post("/addUser", (req, res)=> {
   knex("Login").insert({
      username: req.body.username,
      password: req.body.password
   }).then(myUser => {
   res.redirect("/");
  })
});

//editing the users DISPLAY if logged in
app.get("/editRow/:id", (req, res)=> {
   const username= req.session.username;
    knex.select("ReviewID", 
      "DessertID",
      "RestaurantID",
      "Description",
      "Stars",
      "GlutenFree",
      "DairyFree",
      "Price",
      "UserID").from("Review").where("ReviewID", req.params.id).then(myReview => {
    res.render("editRow", {allReviews: myReview, username: username});
   }).catch( err => {
      console.log(err);
      res.status(500).json({err});
   });
});

//editing the users DISPLAY if logged in
app.post("/editRow", (req, res)=> {
   knex("Review").where("ReviewID", parseInt(req.body.ReviewID)).update({
      DessertID: req.body.DessertID,
      RestaurantID: req.body.RestaurantID,
      Description: req.body.Description,
      Stars: req.body.Stars,
      GlutenFree: req.body.GlutenFree ? "Y" : "N",
      DairyFree: req.body.DairyFree ? "Y" : "N",
      Price: req.body.Price,
      UserID: req.body.UserID
   }).then(allReviews => {
      res.redirect("/");
   })
});

//deleting users (if logged in)
app.post("/deleteRow/:id", (req, res) => {
   knex("Review").where("ReviewID", req.params.id).del().then( allReviews => {
      res.redirect("/");
   }).catch( err => {
      console.log(err);
      res.status(500).json({err});
   });
});

//submiting the survey
app.post("/submitsurvey", async (req, res) => {
   try {
      let dessertIDObj = await knex("Dessert")
         .where({ DessertName: req.body.DessertName })
         .select("DessertID")
         .first();

      let dessertID = dessertIDObj ? dessertIDObj.DessertID : null;

      if (!dessertID) {
         const newDessertId = await knex("Dessert")
            .insert({
               DessertName: req.body.DessertName
            })
            .returning("DessertID");

         dessertID = newDessertId[0];
      }

      let restaurantIDObj = await knex("Restaurant")
         .where({
            RestName: req.body.RestName,
            StreetAddress: req.body.StreetAddress
         })
         .select("RestaurantID")
         .first();

      let restaurantID = restaurantIDObj ? restaurantIDObj.RestaurantID : null;

      if (!restaurantID) {
         const newRestaurantID = await knex("Restaurant")
            .insert({
               RestName: req.body.RestName,
               StreetAddress: req.body.StreetAddress
            })
            .returning("RestaurantID");

         restaurantID = newRestaurantID[0];
      }

      let userIDObj = await knex("User")
         .where({ Email: req.body.Email })
         .select("UserID")
         .first();

      let userID = userIDObj ? userIDObj.UserID : null;

      if (!userID) {
         const newUserID = await knex("User")
            .insert({
               FirstName: req.body.FirstName,
               LastName: req.body.LastName,
               Email: req.body.Email
            })
            .returning("UserID");

         userID = newUserID[0];
      }

      await knex("Review").insert({
         DessertID: dessertID,
         RestaurantID: restaurantID,
         Description: req.body.Description,
         Stars: req.body.Stars,
         GlutenFree: req.body.GlutenFree ? "Y" : "N",
         DairyFree: req.body.DairyFree ? "Y" : "N",
         Price: req.body.Price,
         UserID: userID
      });

      res.redirect("/");
   } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Error submitting survey.');
   }
});


 //listen at the end
app.listen(port,() => console.log("I am listening"));